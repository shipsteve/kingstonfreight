/**
 * Air-waybill-style tracking numbers: "876-" + 8-digit serial, where the last digit is the first seven mod 7
 * (the IATA AWB check-digit rule), so most single-digit typos are rejected instead of matching another shipment.
 */
export const AWB_PREFIX = "876";

const AWB = new RegExp(`^${AWB_PREFIX}-(\\d{7})(\\d)$`);
const LEGACY = /^SHP-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$/;

function cryptoRandom(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 2 ** 32;
}

export function generateTrackingNumber(rand: () => number = cryptoRandom): string {
  let serial = "";
  for (let i = 0; i < 7; i++) serial += Math.floor(rand() * 10);
  return `${AWB_PREFIX}-${serial}${Number(serial) % 7}`;
}

/** Canonical form for lookups: "876-XXXXXXXX" (accepts spaces, dashes, an "AWB" prefix); legacy SHP- uppercased. */
export function normalizeTrackingNumber(s: string): string {
  const compact = s.replace(/\s+/g, "").toUpperCase();
  if (compact.startsWith("SHP-")) return compact;
  const digits = compact.replace(/^AWB/, "").replace(/-/g, "");
  if (/^\d{11}$/.test(digits)) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return compact;
}

export function isTrackingNumber(s: string): boolean {
  if (LEGACY.test(s)) return true;
  const m = AWB.exec(s);
  return !!m && Number(m[1]) % 7 === Number(m[2]);
}
