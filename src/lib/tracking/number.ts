const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PATTERN = new RegExp(`^SHP-[${ALPHABET}]{10}$`);

function cryptoRandom(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 2 ** 32;
}

export function generateTrackingNumber(rand: () => number = cryptoRandom): string {
  let out = "SHP-";
  for (let i = 0; i < 10; i++) out += ALPHABET[Math.floor(rand() * ALPHABET.length)];
  return out;
}

export function normalizeTrackingNumber(s: string): string {
  return s.replace(/\s+/g, "").toUpperCase();
}

export function isTrackingNumber(s: string): boolean {
  return PATTERN.test(s);
}
