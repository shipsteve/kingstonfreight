import { describe, expect, it } from "vitest";
import { priceParcel } from "./parcel";
import type { Address, ParcelRateDef, ZoneDef } from "./types";

const zones: ZoneDef[] = [
  { id: "east", kind: "DOMESTIC", postcodePrefixes: ["1"], countryCodes: [] },
  { id: "eu", kind: "INTERNATIONAL", postcodePrefixes: [], countryCodes: ["FR"] },
  { id: "asia", kind: "INTERNATIONAL", postcodePrefixes: [], countryCodes: ["JP"] },
];
const rates: ParcelRateDef[] = [
  { originZoneId: "east", destZoneId: "eu", maxWeightKg: 2, priceCents: 1000 },
  { originZoneId: "east", destZoneId: "eu", maxWeightKg: 5, priceCents: 2000 },
  { originZoneId: "east", destZoneId: "eu", maxWeightKg: 30, priceCents: 3000 },
];
const ctx = { zones, rates, homeCountry: "US" };

const addr = (countryCode: string, postcode: string): Address => ({
  name: "A",
  line1: "1 St",
  city: "City",
  postcode,
  countryCode,
});
const nyc = addr("US", "10001");
const paris = addr("FR", "75001");
const pkg = (weightKg: number) => [{ weightKg, lengthCm: 10, widthCm: 10, heightCm: 10, qty: 1 }];

describe("priceParcel", () => {
  it("picks the smallest band that fits the billable weight", () => {
    expect(priceParcel({ origin: nyc, destination: paris, packages: pkg(3) }, ctx)).toEqual({
      ok: true,
      priceCents: 2000,
      billableKg: 3,
    });
  });

  it("treats a weight equal to the band limit as inside the band", () => {
    expect(priceParcel({ origin: nyc, destination: paris, packages: pkg(5) }, ctx)).toMatchObject({ priceCents: 2000 });
  });

  it("fails with TOO_HEAVY above the largest band", () => {
    expect(priceParcel({ origin: nyc, destination: paris, packages: pkg(31) }, ctx)).toEqual({
      ok: false,
      reason: "TOO_HEAVY",
    });
  });

  it("fails with NO_RATE when the zone pair has no rates", () => {
    expect(priceParcel({ origin: nyc, destination: addr("JP", "100"), packages: pkg(1) }, ctx)).toEqual({
      ok: false,
      reason: "NO_RATE",
    });
  });

  it("fails with NO_ORIGIN_ZONE when the origin resolves to no zone", () => {
    expect(priceParcel({ origin: addr("US", "90001"), destination: paris, packages: pkg(1) }, ctx)).toEqual({
      ok: false,
      reason: "NO_ORIGIN_ZONE",
    });
  });

  it("fails with NO_DEST_ZONE when the destination resolves to no zone", () => {
    expect(priceParcel({ origin: nyc, destination: addr("BR", "01000"), packages: pkg(1) }, ctx)).toEqual({
      ok: false,
      reason: "NO_DEST_ZONE",
    });
  });
});
