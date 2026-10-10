import type { Address, PackageInput, ParcelRateDef, PriceResult, ZoneDef } from "./types";
import { billableWeightKg } from "./weight";
import { resolveZone } from "./zones";

export function priceParcel(
  input: { origin: Address; destination: Address; packages: PackageInput[] },
  ctx: { zones: ZoneDef[]; rates: ParcelRateDef[]; homeCountry: string },
): PriceResult {
  const originZone = resolveZone(input.origin, ctx.zones, ctx.homeCountry);
  if (!originZone) return { ok: false, reason: "NO_ORIGIN_ZONE" };
  const destZone = resolveZone(input.destination, ctx.zones, ctx.homeCountry);
  if (!destZone) return { ok: false, reason: "NO_DEST_ZONE" };

  const bands = ctx.rates
    .filter((r) => r.originZoneId === originZone.id && r.destZoneId === destZone.id)
    .sort((a, b) => a.maxWeightKg - b.maxWeightKg);
  if (bands.length === 0) return { ok: false, reason: "NO_RATE" };

  const billableKg = billableWeightKg(input.packages);
  const band = bands.find((r) => r.maxWeightKg >= billableKg);
  if (!band) return { ok: false, reason: "TOO_HEAVY" };

  return { ok: true, priceCents: band.priceCents, billableKg };
}
