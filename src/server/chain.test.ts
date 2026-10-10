import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isTxHash, lookupTx, normalizeTxHash, parseTx, resetPriceCache } from "./chain";

const OURS = "bc1qourxaddressxxxxxxxxxxxxxxxxxxxxxxxxxx";
const TX = "a".repeat(64);

const txJson = (confirmed: boolean) => ({
  txid: TX,
  vout: [
    { scriptpubkey_address: OURS, value: 81_000 },
    { scriptpubkey_address: "bc1qsomeoneelse", value: 500_000 },
    { scriptpubkey_address: OURS, value: 19_000 },
  ],
  status: confirmed ? { confirmed: true, block_height: 900_000, block_time: 1_760_000_000 } : { confirmed: false },
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("tx hash helpers", () => {
  it("normalizes case and whitespace", () => {
    expect(normalizeTxHash(`  ${"AB".repeat(32)} `)).toBe("ab".repeat(32));
  });
  it("accepts only 64 hex characters", () => {
    expect(isTxHash("a".repeat(64))).toBe(true);
    expect(isTxHash("a".repeat(63))).toBe(false);
    expect(isTxHash("g".repeat(64))).toBe(false);
  });
});

describe("parseTx", () => {
  it("sums only outputs paid to our address", () => {
    expect(parseTx(txJson(true), OURS, 900_002).paidToUsSats).toBe(100_000);
  });
  it("computes confirmations from the tip height", () => {
    expect(parseTx(txJson(true), OURS, 900_002).confirmations).toBe(3);
    expect(parseTx(txJson(true), OURS, 900_002).blockTime).toBe(new Date(1_760_000_000_000).toISOString());
  });
  it("reports zero confirmations for an unconfirmed tx", () => {
    expect(parseTx(txJson(false), OURS, 900_002)).toMatchObject({ confirmations: 0, blockTime: null });
  });
});

describe("lookupTx", () => {
  beforeEach(() => {
    resetPriceCache();
    vi.stubEnv("CHAIN_LOOKUP", "on");
    vi.stubEnv("BTC_ADDRESS", OURS);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("combines tx, tip height and price into a check", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.endsWith(`/api/tx/${TX}`)) return json(txJson(true));
        if (url.endsWith("/api/blocks/tip/height")) return new Response("900002");
        if (url.includes("coingecko")) return json({ bitcoin: { usd: 60_000 }, litecoin: { usd: 80 } });
        return new Response("?", { status: 500 });
      }),
    );
    const check = await lookupTx("BTC", TX);
    expect(check).toMatchObject({
      found: true,
      paidToUsSats: 100_000,
      confirmations: 3,
      usdEstimateCents: 6000,
      explorerUrl: `https://mempool.space/tx/${TX}`,
    });
  });

  it("uses litecoinspace for LTC", async () => {
    vi.stubEnv("LTC_ADDRESS", "ltc1qours");
    const fetch = vi.fn<(url: string) => Promise<Response>>(async () => json({}, 404));
    vi.stubGlobal("fetch", fetch);
    const check = await lookupTx("LTC", TX);
    expect(check.explorerUrl).toBe(`https://litecoinspace.org/tx/${TX}`);
    expect(String(fetch.mock.calls[0][0])).toContain("litecoinspace.org/api/tx/");
  });

  it("reports not found on 404", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({}, 404)));
    expect(await lookupTx("BTC", TX)).toMatchObject({ found: false, paidToUsSats: 0 });
  });

  it("never throws when the explorer is down", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("timeout"))));
    const check = await lookupTx("BTC", TX);
    expect(check.found).toBe(false);
    expect(check.error).toMatch(/timeout|unavailable/i);
  });

  it("does nothing when lookups are off", async () => {
    vi.stubEnv("CHAIN_LOOKUP", "off");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect((await lookupTx("BTC", TX)).found).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
});
