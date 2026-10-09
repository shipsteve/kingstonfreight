import { describe, expect, it } from "vitest";
import { dollarsToCents, formatMoney } from "./money";

describe("formatMoney", () => {
  it("formats cents as dollars with grouping", () => {
    expect(formatMoney(123456)).toBe("$1,234.56");
  });

  it("formats zero", () => {
    expect(formatMoney(0)).toBe("$0.00");
  });
});

describe("dollarsToCents", () => {
  it("parses dollar strings into integer cents", () => {
    expect(dollarsToCents("1250")).toBe(125000);
    expect(dollarsToCents("1,250.50")).toBe(125050);
    expect(dollarsToCents(" $12.3 ")).toBe(1230);
    expect(dollarsToCents("0.1")).toBe(10);
  });

  it("returns null for empty or invalid input", () => {
    expect(dollarsToCents("")).toBeNull();
    expect(dollarsToCents("abc")).toBeNull();
    expect(dollarsToCents("1.234")).toBeNull();
    expect(dollarsToCents("-5")).toBeNull();
  });
});
