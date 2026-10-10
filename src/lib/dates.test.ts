import { describe, expect, it } from "vitest";
import { formatShipDate, parseDateInput, toDateInput } from "./dates";

describe("ship dates", () => {
  it("parses YYYY-MM-DD as a timezone-safe instant (UTC noon)", () => {
    expect(parseDateInput("2026-10-21")?.toISOString()).toBe("2026-10-21T12:00:00.000Z");
  });

  it("treats empty or invalid input as no date", () => {
    expect(parseDateInput("")).toBeNull();
    expect(parseDateInput(null)).toBeNull();
    expect(parseDateInput("21/10/2026")).toBeNull();
    expect(parseDateInput("2026-02-31")).toBeNull();
  });

  it("formats the calendar day regardless of server timezone", () => {
    expect(formatShipDate(new Date("2026-10-21T12:00:00Z"))).toBe("Oct 21, 2026");
  });

  it("round-trips to a date input value", () => {
    expect(toDateInput(new Date("2026-10-21T12:00:00Z"))).toBe("2026-10-21");
    expect(toDateInput(null)).toBe("");
  });
});
