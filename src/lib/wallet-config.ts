export type CoinCode = "BTC" | "LTC";

export const COIN_NAMES: Record<CoinCode, string> = { BTC: "Bitcoin", LTC: "Litecoin" };

/** Receiving addresses and limits from env. A coin without an address is not offered. */
export function walletConfig(): { minTopUpCents: number; coins: { coin: CoinCode; address: string }[] } {
  const min = Number(process.env.MIN_TOPUP_USD || 50);
  const coins: { coin: CoinCode; address: string }[] = [];
  const btc = process.env.BTC_ADDRESS?.trim();
  const ltc = process.env.LTC_ADDRESS?.trim();
  if (btc) coins.push({ coin: "BTC", address: btc });
  if (ltc) coins.push({ coin: "LTC", address: ltc });
  return { minTopUpCents: Math.round((Number.isFinite(min) && min > 0 ? min : 50) * 100), coins };
}

export function addressFor(coin: CoinCode): string | null {
  return walletConfig().coins.find((c) => c.coin === coin)?.address ?? null;
}

/** BIP21-style payment URI shown as a QR code. */
export function paymentUri(coin: CoinCode, address: string): string {
  return `${coin === "BTC" ? "bitcoin" : "litecoin"}:${address}`;
}
