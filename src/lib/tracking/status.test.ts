import { describe, expect, it } from "vitest";
import { ADMIN_SETTABLE_STATUSES, canTransition } from "./status";

describe("canTransition", () => {
  it("allows normal forward moves", () => {
    expect(canTransition("BOOKED", "IN_TRANSIT")).toBe(true);
  });

  it("blocks leaving terminal statuses", () => {
    expect(canTransition("DELIVERED", "IN_TRANSIT")).toBe(false);
    expect(canTransition("CANCELLED", "BOOKED")).toBe(false);
  });

  it("allows entering and recovering from EXCEPTION", () => {
    expect(canTransition("IN_TRANSIT", "EXCEPTION")).toBe(true);
    expect(canTransition("EXCEPTION", "OUT_FOR_DELIVERY")).toBe(true);
  });

  it("only allows BOOKED or CANCELLED from AWAITING_PAYMENT", () => {
    expect(canTransition("AWAITING_PAYMENT", "PICKED_UP")).toBe(false);
    expect(canTransition("AWAITING_PAYMENT", "BOOKED")).toBe(true);
    expect(canTransition("AWAITING_PAYMENT", "CANCELLED")).toBe(true);
  });

  it("never moves back to AWAITING_PAYMENT or to the same status", () => {
    expect(canTransition("BOOKED", "AWAITING_PAYMENT")).toBe(false);
    expect(canTransition("IN_TRANSIT", "IN_TRANSIT")).toBe(false);
  });

  it("does not offer AWAITING_PAYMENT to admins", () => {
    expect(ADMIN_SETTABLE_STATUSES).not.toContain("AWAITING_PAYMENT");
  });
});
