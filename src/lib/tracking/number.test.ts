import { describe, expect, it } from "vitest";
import { generateTrackingNumber, isTrackingNumber, normalizeTrackingNumber } from "./number";

describe("tracking numbers", () => {
  it("generates SHP- plus 10 unambiguous characters", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateTrackingNumber()).toMatch(/^SHP-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$/);
    }
  });

  it("uses the injected random source", () => {
    expect(generateTrackingNumber(() => 0)).toBe("SHP-AAAAAAAAAA");
  });

  it("normalizes case and whitespace", () => {
    expect(normalizeTrackingNumber(" shp-abcd234567 ")).toBe("SHP-ABCD234567");
  });

  it("validates format", () => {
    expect(isTrackingNumber("SHP-ABCD234567")).toBe(true);
    expect(isTrackingNumber("SHP-ABC")).toBe(false);
    expect(isTrackingNumber("SHP-ABCD23456O")).toBe(false);
  });
});
