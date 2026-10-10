import { describe, expect, it } from "vitest";
import { quoteInputSchema } from "./quote-schema";

const addr = { name: "A", line1: "1 St", city: "C", postcode: "10001", countryCode: "us" };
const box = { weightKg: 1, lengthCm: 10, widthCm: 10, heightCm: 10, qty: 1 };
const parcel = (packages: unknown[]) => ({ serviceType: "PARCEL", origin: addr, destination: addr, packages });

describe("quoteInputSchema", () => {
  it("accepts a valid parcel quote and uppercases country codes", () => {
    const res = quoteInputSchema.parse(parcel([box]));
    expect(res.origin.countryCode).toBe("US");
  });

  it("rejects zero weight, negative dimensions and zero quantity", () => {
    expect(quoteInputSchema.safeParse(parcel([{ ...box, weightKg: 0 }])).success).toBe(false);
    expect(quoteInputSchema.safeParse(parcel([{ ...box, lengthCm: -1 }])).success).toBe(false);
    expect(quoteInputSchema.safeParse(parcel([{ ...box, qty: 0 }])).success).toBe(false);
  });

  it("rejects an empty package list and more than 20 packages", () => {
    expect(quoteInputSchema.safeParse(parcel([])).success).toBe(false);
    expect(quoteInputSchema.safeParse(parcel(Array(21).fill(box))).success).toBe(false);
  });

  it("requires 2-letter country codes", () => {
    const bad = { ...parcel([box]), origin: { ...addr, countryCode: "USA" } };
    expect(quoteInputSchema.safeParse(bad).success).toBe(false);
  });

  it("requires a positive courier distance", () => {
    const courier = { serviceType: "COURIER", origin: addr, destination: addr, distanceKm: 0 };
    expect(quoteInputSchema.safeParse(courier).success).toBe(false);
    expect(quoteInputSchema.safeParse({ ...courier, distanceKm: 4 }).success).toBe(true);
  });

  it("requires freight details", () => {
    const freight = { serviceType: "FREIGHT", origin: addr, destination: addr, packages: [box] };
    expect(quoteInputSchema.safeParse(freight).success).toBe(false);
    const details = { mode: "SEA", cargoType: "Pallets", description: "4 pallets of furniture" };
    expect(quoteInputSchema.safeParse({ ...freight, freightDetails: details }).success).toBe(true);
  });

  it("strips client-supplied prices", () => {
    const res = quoteInputSchema.parse({ ...parcel([box]), priceCents: 1 });
    expect(res).not.toHaveProperty("priceCents");
  });
});
