import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/server/db";
import { submitTopUp } from "@/server/actions/wallet";
import { lookupTx } from "@/server/chain";
import { sendEmail } from "@/server/email";
import { getMyWallet } from "@/server/queries/wallet";
import { makeUser, resetDb } from "./helpers";
import { asUser } from "./session-mock";

vi.mock("@/server/session", () => import("./session-mock"));
vi.mock("@/server/email", () => ({ sendEmail: vi.fn(async () => {}) }));
vi.mock("@/server/chain", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/chain")>()),
  lookupTx: vi.fn(),
}));

const TX = "ab".repeat(32);
const okCheck = {
  found: true,
  paidToUsSats: 100_000,
  confirmations: 2,
  blockTime: null,
  usdEstimateCents: 6000,
  explorerUrl: `https://mempool.space/tx/${TX}`,
  checkedAt: new Date().toISOString(),
};

describe("submitTopUp", () => {
  let ann: Awaited<ReturnType<typeof makeUser>>;

  beforeEach(async () => {
    await resetDb();
    vi.clearAllMocks();
    vi.stubEnv("BTC_ADDRESS", "bc1qours");
    vi.stubEnv("LTC_ADDRESS", "");
    vi.stubEnv("MIN_TOPUP_USD", "50");
    vi.mocked(lookupTx).mockResolvedValue(okCheck);
    ann = await makeUser("ann@example.com");
    asUser(ann);
  });
  afterEach(() => vi.unstubAllEnvs());

  it("records a pending review top-up with the chain check and emails the customer", async () => {
    const res = await submitTopUp({ coin: "BTC", amountCents: 6000, txHash: TX });
    if (!res.ok) throw new Error(res.error);
    const t = await db.topUp.findUniqueOrThrow({ where: { id: res.data.id } });
    expect(t).toMatchObject({ status: "PENDING_REVIEW", coin: "BTC", txHash: TX, requestedCents: 6000, userId: ann.id });
    expect(t.chainCheck).toMatchObject({ found: true, usdEstimateCents: 6000 });
    expect(vi.mocked(sendEmail)).toHaveBeenCalledWith(expect.objectContaining({ to: "ann@example.com" }));
    expect(await db.ledgerEntry.count()).toBe(0);
  });

  it("enforces the $50 minimum", async () => {
    expect(await submitTopUp({ coin: "BTC", amountCents: 4999, txHash: TX })).toEqual({
      ok: false,
      error: "Minimum top-up is $50.00",
    });
  });

  it("rejects malformed transaction ids", async () => {
    expect((await submitTopUp({ coin: "BTC", amountCents: 6000, txHash: "not-a-hash" })).ok).toBe(false);
  });

  it("rejects coins without a configured address", async () => {
    expect(await submitTopUp({ coin: "LTC", amountCents: 6000, txHash: TX })).toEqual({
      ok: false,
      error: "LTC payments aren't available right now",
    });
  });

  it("treats the same transaction in different case/whitespace as a duplicate", async () => {
    await submitTopUp({ coin: "BTC", amountCents: 6000, txHash: TX });
    const other = await makeUser("bob@example.com");
    asUser(other);
    expect(await submitTopUp({ coin: "BTC", amountCents: 6000, txHash: `  ${TX.toUpperCase()} ` })).toEqual({
      ok: false,
      error: "This transaction has already been submitted",
    });
    expect(await db.topUp.count()).toBe(1);
  });

  it("still records the submission when the explorer lookup fails", async () => {
    vi.mocked(lookupTx).mockResolvedValue({ ...okCheck, found: false, error: "Explorer unavailable: timeout" });
    const res = await submitTopUp({ coin: "BTC", amountCents: 6000, txHash: TX });
    if (!res.ok) throw new Error(res.error);
    const t = await db.topUp.findUniqueOrThrow({ where: { id: res.data.id } });
    expect(t.chainCheck).toMatchObject({ found: false, error: "Explorer unavailable: timeout" });
  });

  it("refuses suspended accounts", async () => {
    await db.user.update({ where: { id: ann.id }, data: { accountStatus: "SUSPENDED" } });
    expect(await submitTopUp({ coin: "BTC", amountCents: 6000, txHash: TX })).toEqual({
      ok: false,
      error: "Your account is suspended. Please contact support.",
    });
  });

  it("rate-limits to 10 submissions per hour", async () => {
    for (let i = 0; i < 10; i++) {
      const hash = i.toString(16).padStart(64, "0");
      expect((await submitTopUp({ coin: "BTC", amountCents: 6000, txHash: hash })).ok).toBe(true);
    }
    expect(await submitTopUp({ coin: "BTC", amountCents: 6000, txHash: "f".repeat(64) })).toEqual({
      ok: false,
      error: "Too many submissions. Please try again later.",
    });
  });

  it("requires login", async () => {
    asUser(null);
    expect(await submitTopUp({ coin: "BTC", amountCents: 6000, txHash: TX })).toEqual({ ok: false, error: "Please log in" });
  });
});

describe("getMyWallet", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(lookupTx).mockResolvedValue(okCheck);
    vi.stubEnv("BTC_ADDRESS", "bc1qours");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("returns only the caller's balance and history", async () => {
    const ann = await makeUser("ann@example.com");
    const bob = await makeUser("bob@example.com");
    await db.ledgerEntry.create({ data: { userId: ann.id, amountCents: 7000, kind: "ADJUSTMENT" } });
    await db.ledgerEntry.create({ data: { userId: bob.id, amountCents: 999, kind: "ADJUSTMENT" } });
    asUser(ann);
    await submitTopUp({ coin: "BTC", amountCents: 6000, txHash: TX });
    const w = await getMyWallet();
    expect(w).toMatchObject({ balanceCents: 7000, accountStatus: "PENDING" });
    expect(w?.topUps).toHaveLength(1);
    expect(w?.ledger).toHaveLength(1);
  });

  it("returns null when logged out", async () => {
    asUser(null);
    expect(await getMyWallet()).toBeNull();
  });
});
