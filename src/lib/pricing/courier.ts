import type { Address, CourierRateDef, PriceResult } from "./types";

export function priceCourier(
  input: { origin: Address; destination: Address; distanceKm: number },
  rate: CourierRateDef,
  homeCountry: string,
): PriceResult {
  const home = homeCountry.toUpperCase();
  if (input.origin.countryCode.toUpperCase() !== home || input.destination.countryCode.toUpperCase() !== home) {
    return { ok: false, reason: "NOT_DOMESTIC" };
  }
  if (input.distanceKm > rate.maxKm) return { ok: false, reason: "TOO_FAR" };
  return { ok: true, priceCents: rate.baseFeeCents + Math.ceil(input.distanceKm) * rate.perKmCents };
}
