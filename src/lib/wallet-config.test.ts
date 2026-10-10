import { afterEach, describe, expect, it, vi } from "vitest";
import { walletConfig } from "./wallet-config";

describe("walletConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("offers coins whose configured address is valid", () => {
    vi.stubEnv("BTC_ADDRESS", "14WwT3x32mo5jE35qe1TSp5215YXEfLBxj");
    vi.stubEnv("LTC_ADDRESS", "LZFDN9E4gYDDykk9Q76U96yxXVnrvyFCUJ");
    expect(walletConfig().coins.map((c) => c.coin)).toEqual(["BTC", "LTC"]);
  });

  it("hides (and logs) a coin whose address fails validation", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("BTC_ADDRESS", "14WwT3x32mo5jE35qe1TSp5215YXEfLBxk"); // one character off
    vi.stubEnv("LTC_ADDRESS", "LZFDN9E4gYDDykk9Q76U96yxXVnrvyFCUJ");
    expect(walletConfig().coins.map((c) => c.coin)).toEqual(["LTC"]);
    expect(err).toHaveBeenCalledWith(expect.stringContaining("BTC_ADDRESS"));
  });

  it("allows placeholder addresses only when explicitly enabled for tests", () => {
    vi.stubEnv("BTC_ADDRESS", "bc1q-e2e-test-address");
    vi.stubEnv("LTC_ADDRESS", "");
    vi.stubEnv("ALLOW_TEST_WALLET_ADDRESSES", "1");
    expect(walletConfig().coins.map((c) => c.coin)).toEqual(["BTC"]);
  });
});
