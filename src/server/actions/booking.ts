"use server";

import { asAddress } from "@/lib/address";
import { formatMoney } from "@/lib/money";
import type { PackageInput } from "@/lib/pricing/types";
import { shipmentWeights } from "@/lib/pricing/weight";
import { db } from "../db";
import { sendEmail } from "../email";
import { bookingConfirmedEmail } from "../email-templates";
import { debitForShipment, InsufficientBalanceError, lockUser } from "../ledger";
import { fail, ok, type ActionResult } from "../result";
import { requireUser } from "../session";
import { attachCoordinates, uniqueTrackingNumber } from "../shipments";
import { guarded } from "./guard";

const NOT_APPROVED = "Your account is awaiting approval. Add funds to get started.";
const SUSPENDED = "Your account is suspended. Please contact support.";

class BookingRefused extends Error {}

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

/** Accepts a priced quote and pays for it from the account balance, atomically. */
export async function acceptQuote(quoteId: string): Promise<ActionResult<{ shipmentId: string }>> {
  return guarded(async () => {
    const user = await requireUser();

    let shipment;
    try {
      shipment = await db.$transaction(async (tx) => {
        // Serialises this customer's bookings so concurrent accepts can't overspend.
        const { accountStatus } = await lockUser(tx, user.id);
        if (accountStatus === "SUSPENDED") throw new BookingRefused(SUSPENDED);
        if (accountStatus !== "APPROVED") throw new BookingRefused(NOT_APPROVED);

        const { count } = await tx.quote.updateMany({
          where: {
            id: quoteId,
            userId: user.id,
            status: "PRICED",
            priceCents: { not: null },
            expiresAt: { gt: new Date() },
          },
          data: { status: "ACCEPTED" },
        });
        if (count !== 1) return null;

        const quote = await tx.quote.findUniqueOrThrow({ where: { id: quoteId } });
        const packages = (quote.packages as PackageInput[]) ?? [];
        const weights = shipmentWeights(packages);
        const created = await tx.shipment.create({
          data: {
            quoteId,
            userId: user.id,
            trackingNumber: await uniqueTrackingNumber(tx),
            serviceType: quote.serviceType,
            status: "BOOKED",
            priceCents: quote.priceCents!,
            paymentMethod: "BALANCE",
            paymentStatus: "PAID",
            origin: quote.origin!,
            destination: quote.destination!,
            packages: quote.packages ?? [],
            actualWeightKg: packages.length ? weights.actualKg : null,
            chargeableWeightKg: packages.length ? weights.chargeableKg : null,
            events: { create: { status: "BOOKED", location: "Booking confirmed" } },
          },
        });
        await debitForShipment(tx, { userId: user.id, shipmentId: created.id, amountCents: created.priceCents });
        return created;
      });
    } catch (e) {
      if (e instanceof BookingRefused) return fail(e.message);
      if (e instanceof InsufficientBalanceError) {
        return fail(`Insufficient balance: you need ${formatMoney(e.shortCents)} more.`);
      }
      throw e;
    }

    if (!shipment) return fail(await whyNotAcceptable(quoteId, user.id));

    await attachCoordinates(shipment.id, asAddress(shipment.origin), asAddress(shipment.destination));
    await sendEmail({ to: user.email, ...bookingConfirmedEmail(shipment) });
    return ok({ shipmentId: shipment.id });
  });
}
