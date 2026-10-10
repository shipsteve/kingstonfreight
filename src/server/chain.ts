import { addressFor, type CoinCode } from "@/lib/wallet-config";

/** Snapshot of what the blockchain says about a submitted transaction. Stored on the TopUp for the admin. */
export type ChainCheck = {
  found: boolean;
  paidToUsSats: number;
  confirmations: number;
  blockTime: string | null;
  usdEstimateCents: number | null;
  explorerUrl: string;
  checkedAt: string;
  error?: string;
};

const EXPLORER: Record<CoinCode, string> = {
  BTC: "https://mempool.space",
  LTC: "https://litecoinspace.org",
};
const GECKO_ID: Record<CoinCode, string> = { BTC: "bitcoin", LTC: "litecoin" };
const TIMEOUT_MS = 4000;

export function normalizeTxHash(s: string): string {
  return s.trim().toLowerCase();
}

export function isTxHash(s: string): boolean {
  return /^[0-9a-f]{64}$/.test(s);
}

export function explorerTxUrl(coin: CoinCode, txHash: string): string {
  return `${EXPLORER[coin]}/tx/${txHash}`;
}

type MempoolTx = {
  vout?: { scriptpubkey_address?: string; value?: number }[];
  status?: { confirmed?: boolean; block_height?: number; block_time?: number };
};

/** Pure: mempool.space-style tx JSON → amount sent to our address and confirmation count. */
export function parseTx(
  json: unknown,
  ourAddress: string,
  tipHeight: number,
): { found: true; paidToUsSats: number; confirmations: number; blockTime: string | null } {
  const tx = json as MempoolTx;
  const paidToUsSats = (tx.vout ?? [])
    .filter((o) => o.scriptpubkey_address === ourAddress)
    .reduce((sum, o) => sum + (o.value ?? 0), 0);
  const confirmed = tx.status?.confirmed && tx.status.block_height != null;
  return {
    found: true,
    paidToUsSats,
    confirmations: confirmed ? Math.max(0, tipHeight - tx.status!.block_height! + 1) : 0,
    blockTime: confirmed && tx.status!.block_time ? new Date(tx.status!.block_time * 1000).toISOString() : null,
  };
}

function enabled() {
  const v = process.env.CHAIN_LOOKUP;
  if (v) return v !== "off";
  return process.env.NODE_ENV !== "test";
}

const get = (url: string) => fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { Accept: "application/json" } });

let priceCache: { at: number; usd: Partial<Record<CoinCode, number>> } | null = null;

/** Test helper. */
export function resetPriceCache() {
  priceCache = null;
}

/** USD per coin from CoinGecko, cached 5 minutes. null when unavailable. */
export async function usdPerCoin(coin: CoinCode): Promise<number | null> {
  if (!enabled()) return null;
  if (!priceCache || Date.now() - priceCache.at > 5 * 60_000) {
    try {
      const ids = Object.values(GECKO_ID).join(",");
      const res = await get(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
      if (!res.ok) return priceCache?.usd[coin] ?? null;
      const body = (await res.json()) as Record<string, { usd?: number }>;
      priceCache = { at: Date.now(), usd: { BTC: body[GECKO_ID.BTC]?.usd, LTC: body[GECKO_ID.LTC]?.usd } };
    } catch {
      return priceCache?.usd[coin] ?? null;
    }
  }
  return priceCache.usd[coin] ?? null;
}

/** Looks the transaction up on a public explorer. Never throws: failures come back as { found: false, error }. */
export async function lookupTx(coin: CoinCode, txHash: string): Promise<ChainCheck> {
  const base = {
    found: false,
    paidToUsSats: 0,
    confirmations: 0,
    blockTime: null,
    usdEstimateCents: null,
    explorerUrl: explorerTxUrl(coin, txHash),
    checkedAt: new Date().toISOString(),
  } satisfies ChainCheck;

  if (!enabled()) return { ...base, error: "Lookup disabled" };
  const address = addressFor(coin);
  if (!address) return { ...base, error: `No ${coin} address configured` };

  try {
    const txRes = await get(`${EXPLORER[coin]}/api/tx/${txHash}`);
    if (txRes.status === 404 || txRes.status === 400) return { ...base, error: "Transaction not found" };
    if (!txRes.ok) return { ...base, error: `Explorer unavailable (${txRes.status})` };
    const tx = await txRes.json();

    const tipRes = await get(`${EXPLORER[coin]}/api/blocks/tip/height`);
    const tipHeight = tipRes.ok ? Number(await tipRes.text()) : 0;

    const parsed = parseTx(tx, address, Number.isFinite(tipHeight) ? tipHeight : 0);
    const price = await usdPerCoin(coin);
    return {
      ...base,
      ...parsed,
      usdEstimateCents: price != null ? Math.round((parsed.paidToUsSats / 1e8) * price * 100) : null,
    };
  } catch (e) {
    return { ...base, error: `Explorer unavailable: ${e instanceof Error ? e.message : "error"}` };
  }
}
