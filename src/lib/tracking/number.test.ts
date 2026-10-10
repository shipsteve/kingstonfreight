import { describe, expect, it } from "vitest";
import { generateTrackingNumber, isTrackingNumber, normalizeTrackingNumber } from "./number";

describe("air waybill tracking numbers", () => {
  it("generates 876- plus 8 digits whose last digit is the first seven mod 7", () => {
    for (let i = 0; i < 200; i++) {
      const n = generateTrackingNumber();
      expect(n).toMatch(/^876-\d{8}$/);
      const serial = n.slice(4);
      expect(Number(serial[7])).toBe(Number(serial.slice(0, 7)) % 7);
    }
  });

  it("uses the injected random source", () => {
    expect(generateTrackingNumber(() => 0)).toBe("876-00000000");
  });

  it("normalizes spaces, dashes, case and an AWB prefix to the canonical form", () => {
    expect(normalizeTrackingNumber(" awb 876-4837 9155 ")).toBe("876-48379155");
    expect(normalizeTrackingNumber("87648379155")).toBe("876-48379155");
    expect(normalizeTrackingNumber("876 4837 9155")).toBe("876-48379155");
  });

  it("validates format and check digit", () => {
    expect(isTrackingNumber("876-48379155")).toBe(true);
    expect(isTrackingNumber("876-48379154")).toBe(false); // wrong check digit
    expect(isTrackingNumber("876-4837915")).toBe(false); // too short
    expect(isTrackingNumber("123-48379155")).toBe(false); // not our prefix
  });

  it("still accepts legacy SHP- numbers", () => {
    expect(normalizeTrackingNumber(" shp-abcd234567 ")).toBe("SHP-ABCD234567");
    expect(isTrackingNumber("SHP-ABCD234567")).toBe(true);
    expect(isTrackingNumber("SHP-ABC")).toBe(false);
  });
});
