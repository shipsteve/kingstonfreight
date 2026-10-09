import { describe, expect, it } from "vitest";
import { billableWeightKg } from "./weight";

const box = (weightKg: number, l: number, w: number, h: number, qty = 1) => ({
  weightKg,
  lengthCm: l,
  widthCm: w,
  heightCm: h,
  qty,
});

describe("billableWeightKg", () => {
  it("uses actual weight when heavier than volumetric", () => {
    expect(billableWeightKg([box(2, 10, 10, 10)])).toBe(2);
  });

  it("uses volumetric weight (L*W*H/5000) when larger", () => {
    expect(billableWeightKg([box(1, 50, 40, 30)])).toBe(12);
  });

  it("rounds each package up to 0.5 kg before multiplying by qty", () => {
    expect(billableWeightKg([box(1.2, 10, 10, 10, 3)])).toBe(4.5);
  });

  it("sums multiple packages", () => {
    expect(billableWeightKg([box(2, 10, 10, 10), box(1, 50, 40, 30)])).toBe(14);
  });
});
