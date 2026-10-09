import { describe, expect, it } from "vitest";
import { formatMoney } from "./money";

describe("formatMoney", () => {
  it("formats cents as dollars with grouping", () => {
    expect(formatMoney(123456)).toBe("$1,234.56");
  });

  it("formats zero", () => {
    expect(formatMoney(0)).toBe("$0.00");
  });
});
