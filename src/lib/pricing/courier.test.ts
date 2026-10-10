import { describe, expect, it } from "vitest";
import { priceCourier } from "./courier";
import type { Address } from "./types";

const rate = { baseFeeCents: 1500, perKmCents: 150, maxKm: 100 };
const addr = (countryCode: string): Address => ({ name: "A", line1: "1 St", city: "C", postcode: "10001", countryCode });

describe("priceCourier", () => {
  it("charges base fee plus per started km", () => {
    expect(priceCourier({ origin: addr("US"), destination: addr("US"), distanceKm: 12.3 }, rate, "US")).toEqual({
      ok: true,
      priceCents: 3450,
    });
  });

  it("rejects non-domestic addresses", () => {
    expect(priceCourier({ origin: addr("US"), destination: addr("FR"), distanceKm: 5 }, rate, "US")).toEqual({
      ok: false,
      reason: "NOT_DOMESTIC",
    });
  });

  it("rejects distances above maxKm", () => {
    expect(priceCourier({ origin: addr("US"), destination: addr("US"), distanceKm: 101 }, rate, "US")).toEqual({
      ok: false,
      reason: "TOO_FAR",
    });
  });
});
