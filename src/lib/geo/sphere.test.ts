import { describe, expect, it } from "vitest";
import { arcPoints, latLngToVector3 } from "./sphere";

const len = (v: [number, number, number]) => Math.hypot(...v);
const close = (a: [number, number, number], b: [number, number, number]) =>
  a.forEach((x, i) => expect(x).toBeCloseTo(b[i], 5));

describe("latLngToVector3", () => {
  it("puts (0,0) on +x", () => close(latLngToVector3(0, 0, 1), [1, 0, 0]));
  it("puts the north pole on +y", () => close(latLngToVector3(90, 0, 1), [0, 1, 0]));
  it("puts 90°E on -z", () => close(latLngToVector3(0, 90, 1), [0, 0, -1]));
  it("scales by radius", () => expect(len(latLngToVector3(35, 120, 2.5))).toBeCloseTo(2.5, 6));
});

describe("arcPoints", () => {
  const from = { lat: 40.7, lng: -74 };
  const to = { lat: 48.9, lng: 2.3 };

  it("returns segments + 1 points from start to end", () => {
    const pts = arcPoints(from, to, 1, 32);
    expect(pts).toHaveLength(33);
    close(pts[0], latLngToVector3(from.lat, from.lng, 1));
    close(pts[32], latLngToVector3(to.lat, to.lng, 1));
  });

  it("lifts the midpoint above the surface", () => {
    const pts = arcPoints(from, to, 1, 32);
    expect(len(pts[16])).toBeGreaterThan(1.05);
  });

  it("handles identical endpoints without NaN", () => {
    const pts = arcPoints(from, from, 1, 8);
    expect(pts.flat().every(Number.isFinite)).toBe(true);
  });
});
