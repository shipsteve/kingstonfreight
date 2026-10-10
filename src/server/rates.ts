import type { Quote } from "@prisma/client";
import { config } from "@/lib/config";
import { priceCourier } from "@/lib/pricing/courier";
import { priceParcel } from "@/lib/pricing/parcel";
import type { Address, CourierRateDef, PackageInput, ParcelRateDef, ZoneDef } from "@/lib/pricing/types";
import { db } from "./db";

export async function loadPricingContext(): Promise<{
  zones: ZoneDef[];
  rates: ParcelRateDef[];
  courier: CourierRateDef;
}> {
  const [zones, rates, courier] = await Promise.all([
    db.zone.findMany(),
    db.parcelRate.findMany(),
    db.courierRate.findUnique({ where: { id: "singleton" } }),
  ]);
  return {
    zones,
    rates,
    // No courier rate configured means courier is unavailable (every distance is too far).
    courier: courier ?? { baseFeeCents: 0, perKmCents: 0, maxKm: 0 },
  };
}

type PricingContext = Awaited<ReturnType<typeof loadPricingContext>>;

/** Rate-table price shown to staff as a hint. Freight (and anything the tables can't price) → null. */
export function suggestPrice(
  quote: Pick<Quote, "serviceType" | "origin" | "destination" | "packages" | "distanceKm">,
  ctx: PricingContext,
): number | null {
  const origin = quote.origin as Address;
  const destination = quote.destination as Address;
  if (quote.serviceType === "PARCEL") {
    const res = priceParcel(
      { origin, destination, packages: (quote.packages as PackageInput[]) ?? [] },
      { zones: ctx.zones, rates: ctx.rates, homeCountry: config.homeCountry },
    );
    return res.ok ? res.priceCents : null;
  }
  if (quote.serviceType === "COURIER" && quote.distanceKm != null) {
    const res = priceCourier({ origin, destination, distanceKm: quote.distanceKm }, ctx.courier, config.homeCountry);
    return res.ok ? res.priceCents : null;
  }
  return null;
}
