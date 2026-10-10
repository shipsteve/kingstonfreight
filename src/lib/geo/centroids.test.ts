import { describe, expect, it } from "vitest";
import { countryCentroid } from "./centroids";
import { COUNTRY_CODES } from "./countries";

describe("countryCentroid", () => {
  it("finds countries case-insensitively", () => {
    const us = countryCentroid("us");
    expect(us).not.toBeNull();
    expect(us!.lat).toBeGreaterThan(25);
    expect(us!.lat).toBeLessThan(50);
    expect(us!.lng).toBeLessThan(-60);
  });

  it("returns null for unknown codes", () => {
    expect(countryCentroid("ZZ")).toBeNull();
  });

  it("covers every country in the picker with valid coordinates", () => {
    for (const code of COUNTRY_CODES) {
      const c = countryCentroid(code);
      expect(c, code).not.toBeNull();
      expect(Math.abs(c!.lat), code).toBeLessThanOrEqual(90);
      expect(Math.abs(c!.lng), code).toBeLessThanOrEqual(180);
    }
  });
});
