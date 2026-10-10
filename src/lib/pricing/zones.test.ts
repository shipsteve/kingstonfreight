import { describe, expect, it } from "vitest";
import type { ZoneDef } from "./types";
import { normalizePostcode, resolveZone } from "./zones";

const zones: ZoneDef[] = [
  { id: "east", kind: "DOMESTIC", postcodePrefixes: ["0", "1", "2", "3", "4"], countryCodes: [] },
  { id: "west", kind: "DOMESTIC", postcodePrefixes: ["5", "6", "7", "8", "9"], countryCodes: [] },
  { id: "eu", kind: "INTERNATIONAL", postcodePrefixes: [], countryCodes: ["GB", "FR"] },
  { id: "row", kind: "INTERNATIONAL", postcodePrefixes: [], countryCodes: [] },
];

describe("normalizePostcode", () => {
  it("uppercases and strips whitespace", () => {
    expect(normalizePostcode(" sw1a 1aa ")).toBe("SW1A1AA");
  });
});

describe("resolveZone", () => {
  it("matches domestic zones by postcode prefix", () => {
    expect(resolveZone({ countryCode: "US", postcode: "10001" }, zones, "US")?.id).toBe("east");
    expect(resolveZone({ countryCode: "US", postcode: "94105" }, zones, "US")?.id).toBe("west");
  });

  it("prefers the longest matching prefix", () => {
    const withSf: ZoneDef[] = [...zones, { id: "sf", kind: "DOMESTIC", postcodePrefixes: ["941"], countryCodes: [] }];
    expect(resolveZone({ countryCode: "US", postcode: "94105" }, withSf, "US")?.id).toBe("sf");
  });

  it("normalizes postcodes and country codes before matching", () => {
    expect(resolveZone({ countryCode: "us", postcode: " 10001 " }, zones, "US")?.id).toBe("east");
  });

  it("matches international zones by country, case-insensitively", () => {
    expect(resolveZone({ countryCode: "fr", postcode: "75001" }, zones, "US")?.id).toBe("eu");
  });

  it("falls back to the international zone with no countries", () => {
    expect(resolveZone({ countryCode: "BR", postcode: "01000" }, zones, "US")?.id).toBe("row");
  });

  it("returns null for unlisted countries when there is no fallback zone", () => {
    expect(resolveZone({ countryCode: "BR", postcode: "01000" }, zones.slice(0, 3), "US")).toBeNull();
  });

  it("never uses a domestic zone as the international fallback", () => {
    const domesticOnly: ZoneDef[] = [{ id: "d", kind: "DOMESTIC", postcodePrefixes: ["1"], countryCodes: [] }];
    expect(resolveZone({ countryCode: "BR", postcode: "01000" }, domesticOnly, "US")).toBeNull();
  });

  it("returns null for a home-country postcode that matches no domestic zone", () => {
    const eastOnly = zones.filter((z) => z.id !== "west");
    expect(resolveZone({ countryCode: "US", postcode: "94105" }, eastOnly, "US")).toBeNull();
  });
});
