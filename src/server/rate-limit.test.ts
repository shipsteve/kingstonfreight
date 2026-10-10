import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("allows up to the limit within the window, then blocks", () => {
    expect([1, 2, 3, 4].map(() => rateLimit("ip-a", 3, 60_000))).toEqual([true, true, true, false]);
  });

  it("allows again once the window has passed", () => {
    for (let i = 0; i < 3; i++) rateLimit("ip-b", 3, 60_000);
    expect(rateLimit("ip-b", 3, 60_000)).toBe(false);
    vi.advanceTimersByTime(60_001);
    expect(rateLimit("ip-b", 3, 60_000)).toBe(true);
  });

  it("tracks keys independently", () => {
    for (let i = 0; i < 3; i++) rateLimit("ip-c", 3, 60_000);
    expect(rateLimit("ip-d", 3, 60_000)).toBe(true);
  });
});
