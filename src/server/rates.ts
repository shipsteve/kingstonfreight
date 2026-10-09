import type { CourierRateDef, ParcelRateDef, ZoneDef } from "@/lib/pricing/types";
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
