import { describe, expect, it } from "vitest";
import { qrSvg } from "./qr";

describe("qrSvg", () => {
  it("renders an inline SVG", async () => {
    const svg = await qrSvg("https://kingstonfreight.com/track/SHP-ABCD234567");
    expect(svg.trimStart().startsWith("<svg")).toBe(true);
    expect(svg).toContain("<path");
  });
});
