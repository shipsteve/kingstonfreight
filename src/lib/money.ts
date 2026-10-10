import { config } from "./config";

const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: config.currency,
});

export function formatMoney(cents: number): string {
  return formatter.format(cents / 100);
}

/** "1,250.50" / "$12.3" → integer cents; null when empty, negative, or more than 2 decimals. */
export function dollarsToCents(input: string): number | null {
  const s = input.replace(/[\s,$]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [whole, frac = ""] = s.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}
