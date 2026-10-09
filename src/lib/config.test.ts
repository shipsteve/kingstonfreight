import { afterEach, describe, expect, it, vi } from "vitest";

async function loadConfig() {
  vi.resetModules();
  return (await import("./config")).config;
}

describe("config", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("defaults to US / USD", async () => {
    vi.stubEnv("HOME_COUNTRY", "");
    vi.stubEnv("CURRENCY", "");
    const config = await loadConfig();
    expect(config.homeCountry).toBe("US");
    expect(config.currency).toBe("USD");
    expect(config.volumetricDivisor).toBe(5000);
    expect(config.quoteValidityDays).toBe(7);
  });

  it("uppercases HOME_COUNTRY from env", async () => {
    vi.stubEnv("HOME_COUNTRY", "gb");
    const config = await loadConfig();
    expect(config.homeCountry).toBe("GB");
  });
});
