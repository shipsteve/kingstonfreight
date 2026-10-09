import { describe, expect, it } from "vitest";
import { shouldUse3D } from "./capability";

describe("shouldUse3D", () => {
  it("uses 3D on a capable desktop", () => {
    expect(shouldUse3D({ webgl: true, reducedMotion: false, width: 1280 })).toBe(true);
  });
  it("falls back without WebGL", () => {
    expect(shouldUse3D({ webgl: false, reducedMotion: false, width: 1280 })).toBe(false);
  });
  it("falls back when the user prefers reduced motion", () => {
    expect(shouldUse3D({ webgl: true, reducedMotion: true, width: 1280 })).toBe(false);
  });
  it("falls back on small screens", () => {
    expect(shouldUse3D({ webgl: true, reducedMotion: false, width: 767 })).toBe(false);
    expect(shouldUse3D({ webgl: true, reducedMotion: false, width: 768 })).toBe(true);
  });
});
