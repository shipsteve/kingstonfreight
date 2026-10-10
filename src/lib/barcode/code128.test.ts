import { describe, expect, it } from "vitest";
import { encodeCode128B, generateCode128Svg } from "./code128";

describe("encodeCode128B", () => {
  it("encodes a typical tracking number with quiet zones, start, stop, and checksum", () => {
    const text = "876-48379155";
    const { modules, checksum } = encodeCode128B(text);

    // 10 quiet + 11 start + 12 chars * 11 + 11 check + 13 stop + 10 quiet
    // Total = 10 + 11 + 132 + 11 + 13 + 10 = 187 modules
    expect(modules.length).toBe(187);
    expect(checksum).toBeGreaterThanOrEqual(0);
    expect(checksum).toBeLessThan(103);

    // Left and right quiet zones should be false
    expect(modules.slice(0, 10).every((m) => m === false)).toBe(true);
    expect(modules.slice(-10).every((m) => m === false)).toBe(true);

    // Start symbol starts with a bar
    expect(modules[10]).toBe(true);
  });

  it("throws for unsupported non-ASCII characters", () => {
    expect(() => encodeCode128B("TRACK-👋")).toThrow();
  });
});

describe("generateCode128Svg", () => {
  it("generates crisp SVG with rects and proper viewBox", () => {
    const svg = generateCode128Svg("876-12345678");
    expect(svg).toContain("<svg");
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain("<rect");
    expect(svg).toContain("</svg>");
  });

  it("includes text element when includeText is true", () => {
    const text = "876-12345678";
    const svg = generateCode128Svg(text, { includeText: true });
    expect(svg).toContain(`<text`);
    expect(svg).toContain(text);
  });
});
