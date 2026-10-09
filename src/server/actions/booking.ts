"use server";

import { db } from "../db";
import { sendEmail } from "../email";
import { bookingConfirmedEmail } from "../email-templates";
import { fail, ok, type ActionResult } from "../result";
import { requireUser } from "../session";
import { uniqueTrackingNumber } from "../shipments";
import { createCheckoutSession } from "../stripe";
import { guarded } from "./guard";

const PAYMENT_START_FAILED = "We couldn't start the payment. Please try again from your shipment page.";

async function whyNotAcceptable(quoteId: string, userId: string): Promise<string> {
  const quote = await db.quote.findFirst({ where: { id: quoteId, userId } });
  if (!quote) return "Not found";
  if (quote.status === "ACCEPTED") return "Quote already accepted";
  if (quote.status === "PENDING_REVIEW") return "This quote hasn't been priced yet";
  if (quote.status === "DECLINED") return "This quote was declined";
  if (quote.status === "EXPIRED" || (quote.expiresAt && quote.expiresAt <= new Date())) {
    await db.quote.updateMany({ where: { id: quoteId, status: "PRICED" }, data: { status: "EXPIRED" } });
    return "Quote has expired";
  }
  return "This quote can't be accepted";
}

export async function acceptQuote(
  quoteId: string,
): Promise<ActionResult<{ shipmentId: string; checkoutUrl: string | null }>> {
  return guarded<{ shipmentId: string; checkoutUrl: string | null }>(async () => {
    const user = await requireUser();

    const shipment = await db.$transaction(async (tx) => {
      // Conditional update is the lock: of two concurrent accepts, only one sees count === 1.
      const { count } = await tx.quote.updateMany({
        where: { id: quoteId, userId: user.id, status: "PRICED", priceCents: { not: null }, expiresAt: { gt: new Date() } },
        data: { status: "ACCEPTED" },
      });
      if (count !== 1) return null;

      const quote = await tx.quote.findUniqueOrThrow({ where: { id: quoteId } });
      const byInvoice = quote.serviceType === "FREIGHT";
      const created = await tx.shipment.create({
        data: {
          quoteId,
          userId: user.id,
          trackingNumber: await uniqueTrackingNumber(tx),
          serviceType: quote.serviceType,
          status: byInvoice ? "BOOKED" : "AWAITING_PAYMENT",
          priceCents: quote.priceCents!,
          paymentMethod: byInvoice ? "INVOICE" : "CARD",
          origin: quote.origin!,
          destination: quote.destination!,
        },
      });
      if (byInvoice) {
        await tx.trackingEvent.create({
          data: { shipmentId: created.id, status: "BOOKED", location: "Booking confirmed" },
        });
      }
      return created;
    });

    if (!shipment) return fail(await whyNotAcceptable(quoteId, user.id));

    if (shipment.paymentMethod === "INVOICE") {
      await sendEmail({ to: user.email, ...bookingConfirmedEmail(shipment) });
      return ok({ shipmentId: shipment.id, checkoutUrl: null });
    }

    try {
      const session = await createCheckoutSession({
        shipmentId: shipment.id,
        trackingNumber: shipment.trackingNumber,
        priceCents: shipment.priceCents,
        customerEmail: user.email,
      });
      await db.shipment.update({ where: { id: shipment.id }, data: { stripeSessionId: session.id } });
      return ok({ shipmentId: shipment.id, checkoutUrl: session.url });
    } catch (e) {
      console.error("[booking] checkout session failed", e);
      // The shipment exists and stays AWAITING_PAYMENT; the customer can retry via startPayment.
      return ok({ shipmentId: shipment.id, checkoutUrl: null });
    }
  });
}

export async function startPayment(shipmentId: string): Promise<ActionResult<{ checkoutUrl: string }>> {
  return guarded(async () => {
    const user = await requireUser();
    const shipment = await db.shipment.findFirst({ where: { id: shipmentId, userId: user.id } });
    if (!shipment) return fail("Not found");
    if (shipment.paymentStatus === "PAID") return fail("This shipment is already paid");
    if (shipment.paymentMethod !== "CARD" || shipment.status !== "AWAITING_PAYMENT")
      return fail("This shipment doesn't take card payment");

    try {
      const session = await createCheckoutSession({
        shipmentId: shipment.id,
        trackingNumber: shipment.trackingNumber,
        priceCents: shipment.priceCents,
        customerEmail: user.email,
      });
      await db.shipment.update({ where: { id: shipment.id }, data: { stripeSessionId: session.id } });
      return ok({ checkoutUrl: session.url });
    } catch (e) {
      console.error("[booking] checkout session failed", e);
      return fail(PAYMENT_START_FAILED);
    }
  });
}
