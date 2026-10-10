import { afterEach, describe, expect, it, vi } from "vitest";
import { trackingUrl } from "./receipt";

describe("trackingUrl", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("joins APP_URL and the tracking path without a double slash", () => {
    vi.stubEnv("APP_URL", "https://kingstonfreight.com/");
    expect(trackingUrl("SHP-ABCD234567")).toBe("https://kingstonfreight.com/track/SHP-ABCD234567");
  });

  it("falls back to localhost in development", () => {
    vi.stubEnv("APP_URL", "");
    expect(trackingUrl("SHP-ABCD234567")).toBe("http://localhost:3000/track/SHP-ABCD234567");
  });
});
