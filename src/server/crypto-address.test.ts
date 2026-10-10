import { describe, expect, it } from "vitest";
import { isValidAddress } from "./crypto-address";

describe("isValidAddress", () => {
  it("accepts valid Bitcoin legacy, segwit and taproot addresses", () => {
    expect(isValidAddress("BTC", "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa")).toBe(true); // genesis, P2PKH
    expect(isValidAddress("BTC", "14WwT3x32mo5jE35qe1TSp5215YXEfLBxj")).toBe(true);
    expect(isValidAddress("BTC", "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4")).toBe(true); // BIP173 vector
    expect(isValidAddress("BTC", "bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0")).toBe(true); // BIP350 vector
  });

  it("accepts valid Litecoin addresses", () => {
    expect(isValidAddress("LTC", "LZFDN9E4gYDDykk9Q76U96yxXVnrvyFCUJ")).toBe(true);
  });

  it("rejects a single mistyped character (checksum)", () => {
    expect(isValidAddress("BTC", "14WwT3x32mo5jE35qe1TSp5215YXEfLBxk")).toBe(false);
    expect(isValidAddress("LTC", "LZFDN9E4gYDDykk9Q76U96yxXVnrvyFCUK")).toBe(false);
    expect(isValidAddress("BTC", "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t5")).toBe(false);
  });

  it("rejects an address for the other coin", () => {
    expect(isValidAddress("LTC", "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa")).toBe(false);
    expect(isValidAddress("BTC", "LZFDN9E4gYDDykk9Q76U96yxXVnrvyFCUJ")).toBe(false);
    expect(isValidAddress("LTC", "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4")).toBe(false);
  });

  it("rejects placeholders and junk", () => {
    expect(isValidAddress("BTC", "bc1q-placeholder-dev-only")).toBe(false);
    expect(isValidAddress("BTC", "")).toBe(false);
    expect(isValidAddress("LTC", "LZFDN9E4gYDDykk9Q76U96yxXVnrvyFCU0")).toBe(false);
  });
});
