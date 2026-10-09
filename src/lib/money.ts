import { config } from "./config";

const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: config.currency,
});

export function formatMoney(cents: number): string {
  return formatter.format(cents / 100);
}
