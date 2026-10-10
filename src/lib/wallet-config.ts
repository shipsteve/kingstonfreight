import { isValidAddress } from "@/server/crypto-address";
import { COIN_NAMES, type CoinCode } from "./coins";

export { COIN_NAMES, type CoinCode };

/**
 * Receiving addresses and limits from env (server-only). A coin is offered only if its address passes
 * checksum validation, so a typo in BTC_ADDRESS/LTC_ADDRESS can never be shown to customers.
 * ALLOW_TEST_WALLET_ADDRESSES=1 (E2E only) skips validation for placeholder addresses.
 */
export function walletConfig(): { minTopUpCents: number; coins: { coin: CoinCode; address: string }[] } {
  const min = Number(process.env.MIN_TOPUP_USD || 50);
  const allowTest = process.env.ALLOW_TEST_WALLET_ADDRESSES === "1";
  const coins: { coin: CoinCode; address: string }[] = [];
  for (const coin of ["BTC", "LTC"] as const) {
    const address = process.env[`${coin}_ADDRESS`]?.trim();
    if (!address) continue;
    if (!allowTest && !isValidAddress(coin, address)) {
      console.error(`[wallet] ${coin}_ADDRESS is not a valid ${COIN_NAMES[coin]} address; ${coin} top-ups are disabled`);
      continue;
    }
    coins.push({ coin, address });
  }
  return { minTopUpCents: Math.round((Number.isFinite(min) && min > 0 ? min : 50) * 100), coins };
}

export function addressFor(coin: CoinCode): string | null {
  return walletConfig().coins.find((c) => c.coin === coin)?.address ?? null;
}

/** BIP21-style payment URI shown as a QR code. */
export function paymentUri(coin: CoinCode, address: string): string {
  return `${coin === "BTC" ? "bitcoin" : "litecoin"}:${address}`;
}
