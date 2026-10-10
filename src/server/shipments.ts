import { createHash, randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { generateTrackingNumber } from "@/lib/tracking/number";
import { db } from "./db";
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

/** One-time claim token for an order placed under an email: the raw token goes in the email, only its hash is stored. */
export function newClaimToken(): { token: string; hash: string } {
  const token = randomBytes(24).toString("base64url");
  return { token, hash: hashClaimToken(token) };
}

export function hashClaimToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
