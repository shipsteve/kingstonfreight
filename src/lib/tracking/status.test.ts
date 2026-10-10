import { describe, expect, it } from "vitest";
import { canTransition } from "./status";

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

  it("never moves to the same status", () => {
    expect(canTransition("IN_TRANSIT", "IN_TRANSIT")).toBe(false);
  });

});
