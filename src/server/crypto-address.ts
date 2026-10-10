import { createHash } from "node:crypto";
import type { CoinCode } from "@/lib/coins";

// Address formats accepted per coin.
const BASE58_VERSIONS: Record<CoinCode, number[]> = {
  BTC: [0x00, 0x05], // 1… (P2PKH), 3… (P2SH)
  LTC: [0x30, 0x32, 0x05], // L…, M… (P2SH), legacy 3…
};
const BECH32_HRP: Record<CoinCode, string> = { BTC: "bc", LTC: "ltc" };

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const sha256 = (b: Uint8Array) => createHash("sha256").update(b).digest();

function base58CheckVersion(s: string): number | null {
  let n = BigInt(0);
  for (const c of s) {
    const i = B58.indexOf(c);
    if (i < 0) return null;
    n = n * BigInt(58) + BigInt(i);
  }
  let hex = n.toString(16);
  if (hex.length % 2) hex = `0${hex}`;
  const leadingZeros = s.match(/^1*/)![0].length;
  const bytes = Buffer.concat([Buffer.alloc(leadingZeros), Buffer.from(hex, "hex")]);
  if (bytes.length !== 25) return null; // 1 version + 20 hash + 4 checksum
  const body = bytes.subarray(0, 21);
  const checksum = sha256(sha256(body)).subarray(0, 4);
  return checksum.equals(bytes.subarray(21)) ? body[0] : null;
}

// BIP173 / BIP350
const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

function polymod(values: number[]): number {
  let chk = 1;
  for (const v of values) {
    const top = chk >>> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) if ((top >>> i) & 1) chk ^= GEN[i];
  }
  return chk >>> 0;
}

function hrpExpand(hrp: string): number[] {
  return [...[...hrp].map((c) => c.charCodeAt(0) >> 5), 0, ...[...hrp].map((c) => c.charCodeAt(0) & 31)];
}

function convertBits(data: number[], from: number, to: number): number[] | null {
  let acc = 0;
  let bits = 0;
  const out: number[] = [];
  const maxv = (1 << to) - 1;
  for (const v of data) {
    acc = (acc << from) | v;
    bits += from;
    while (bits >= to) {
      bits -= to;
      out.push((acc >> bits) & maxv);
    }
  }
  if (bits >= from || ((acc << (to - bits)) & maxv)) return null;
  return out;
}

function isValidSegwit(addr: string, hrp: string): boolean {
  if (addr !== addr.toLowerCase() && addr !== addr.toUpperCase()) return false;
  const s = addr.toLowerCase();
  const sep = s.lastIndexOf("1");
  if (s.slice(0, sep) !== hrp || sep + 7 > s.length || s.length > 90) return false;
  const data = [...s.slice(sep + 1)].map((c) => CHARSET.indexOf(c));
  if (data.includes(-1)) return false;
  const witnessVersion = data[0];
  const constant = polymod([...hrpExpand(hrp), ...data]);
  if (constant !== (witnessVersion === 0 ? 1 : 0x2bc830a3)) return false; // bech32 for v0, bech32m for v1+
  const program = convertBits(data.slice(1, -6), 5, 8);
  if (!program || program.length < 2 || program.length > 40 || witnessVersion > 16) return false;
  return witnessVersion !== 0 || program.length === 20 || program.length === 32;
}

/** True only for a well-formed address of this coin with a valid checksum. */
export function isValidAddress(coin: CoinCode, address: string): boolean {
  const a = address.trim();
  if (!a) return false;
  if (a.toLowerCase().startsWith(`${BECH32_HRP[coin]}1`)) return isValidSegwit(a, BECH32_HRP[coin]);
  const version = base58CheckVersion(a);
  return version !== null && BASE58_VERSIONS[coin].includes(version);
}
