import type { Prisma } from "@prisma/client";
import { generateTrackingNumber } from "@/lib/tracking/number";
import { db } from "./db";
import { sendEmail } from "./email";
import { bookingConfirmedEmail } from "./email-templates";
import { geocodeCity } from "./geocode";

/**
 * Picks a tracking number not yet in use. Checked inside the caller's transaction rather than
 * retried on unique violation, because a violation aborts the whole Postgres transaction.
 */
export async function uniqueTrackingNumber(tx: Prisma.TransactionClient): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const candidate = generateTrackingNumber();
    if (!(await tx.shipment.findUnique({ where: { trackingNumber: candidate }, select: { id: true } }))) return candidate;
  }
  throw new Error("Could not allocate a tracking number");
}

/**
 * Stripe webhook handler body. Idempotent: only the first call for an unpaid shipment does anything.
 * Payment is always recorded; the shipment is only moved to BOOKED if it was still awaiting payment
 * (an admin may already have booked or advanced it by hand).
 */
export async function completeCheckout(sessionId: string, shipmentId: string): Promise<"updated" | "noop"> {
  const result = await db.$transaction(async (tx) => {
    const { count } = await tx.shipment.updateMany({
      where: { id: shipmentId, paymentStatus: "UNPAID" },
      data: { paymentStatus: "PAID", stripeSessionId: sessionId },
    });
    if (count !== 1) return null;
    const booked = await tx.shipment.updateMany({
      where: { id: shipmentId, status: "AWAITING_PAYMENT" },
      data: { status: "BOOKED" },
    });
    if (booked.count === 1) {
      await tx.trackingEvent.create({ data: { shipmentId, status: "BOOKED", location: "Booking confirmed" } });
    }
    const shipment = await tx.shipment.findUniqueOrThrow({ where: { id: shipmentId }, include: { user: true } });
    return { shipment, justBooked: booked.count === 1 };
  });
  if (!result) return "noop";

  if (result.justBooked) await sendEmail({ to: result.shipment.user.email, ...bookingConfirmedEmail(result.shipment) });
  return "updated";
}

/** Best effort: store city coordinates for the tracking globe. Never throws; missing ones fall back to centroids. */
export async function attachCoordinates(
  shipmentId: string,
  origin: { city: string; countryCode: string },
  destination: { city: string; countryCode: string },
): Promise<void> {
  try {
    const [o, d] = await Promise.all([geocodeCity(origin), geocodeCity(destination)]);
    if (!o && !d) return;
    await db.shipment.update({
      where: { id: shipmentId },
      data: { originLat: o?.lat, originLng: o?.lng, destLat: d?.lat, destLng: d?.lng },
    });
  } catch (e) {
    console.warn("[geocode] could not store coordinates", e);
  }
}
