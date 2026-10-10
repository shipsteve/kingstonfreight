import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/server/db";
import {
  adjustBalance,
  approveTopUp,
  recheckTopUp,
  rejectTopUp,
  setAccountStatus,
} from "@/server/actions/admin-funding";
import { acceptQuote } from "@/server/actions/booking";
import { submitTopUp } from "@/server/actions/wallet";
import { lookupTx } from "@/server/chain";
import { sendEmail } from "@/server/email";
import { balanceCents } from "@/server/ledger";
import { getAdminCounts, listCustomers, listTopUpsToReview } from "@/server/queries/admin";
import { makeUser, nycAddress, parisAddress, resetDb, smallBox } from "./helpers";
import { asUser } from "./session-mock";

vi.mock("@/server/session", () => import("./session-mock"));
vi.mock("@/server/email", () => ({ sendEmail: vi.fn(async () => {}) }));
vi.mock("@/server/geocode", () => ({ geocodeCity: vi.fn(async () => null) }));
vi.mock("@/server/chain", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/chain")>()),
  lookupTx: vi.fn(),
}));

const check = (over: object = {}) => ({
  found: true,
  paidToUsSats: 100_000,
  confirmations: 2,
  blockTime: null,
  usdEstimateCents: 6000,
  explorerUrl: "https://mempool.space/tx/x",
  checkedAt: new Date().toISOString(),
  ...over,
});

let n = 0;
const hash = () => (++n).toString(16).padStart(64, "0");

describe("admin funding", () => {
  let admin: Awaited<ReturnType<typeof makeUser>>;
  let ann: Awaited<ReturnType<typeof makeUser>>;

  async function pendingTopUp(user = ann, amountCents = 6000) {
    asUser(user);
    const res = await submitTopUp({ coin: "BTC", amountCents, txHash: hash() });
    if (!res.ok) throw new Error(res.error);
    asUser(admin);
    vi.mocked(sendEmail).mockClear();
    return res.data.id;
  }

  beforeEach(async () => {
    await resetDb();
    vi.clearAllMocks();
    vi.stubEnv("BTC_ADDRESS", "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4");
    vi.mocked(lookupTx).mockResolvedValue(check());
    admin = await makeUser("ops@example.com", "ADMIN");
    ann = await makeUser("ann@example.com");
    asUser(admin);
  });
  afterEach(() => vi.unstubAllEnvs());

  it("approves a first top-up: credits the balance and approves the account", async () => {
    const id = await pendingTopUp();
    expect((await approveTopUp({ topUpId: id, creditedCents: 6000 })).ok).toBe(true);
    expect(await balanceCents(db, ann.id)).toBe(6000);
    const t = await db.topUp.findUniqueOrThrow({ where: { id } });
    expect(t).toMatchObject({ status: "APPROVED", creditedCents: 6000, reviewedById: admin.id });
    const u = await db.user.findUniqueOrThrow({ where: { id: ann.id } });
    expect(u).toMatchObject({ accountStatus: "APPROVED", approvedById: admin.id });
    expect(u.approvedAt).not.toBeNull();
    expect(vi.mocked(sendEmail)).toHaveBeenCalledTimes(2); // funds added + account approved
  });

  it("only sends the funds email for an already-approved customer", async () => {
    await db.user.update({ where: { id: ann.id }, data: { accountStatus: "APPROVED" } });
    const id = await pendingTopUp();
    await approveTopUp({ topUpId: id, creditedCents: 5500 });
    expect(await balanceCents(db, ann.id)).toBe(5500);
    expect(vi.mocked(sendEmail)).toHaveBeenCalledTimes(1);
  });

  it("credits once even if approve is clicked twice (sequentially or at once)", async () => {
    const id = await pendingTopUp();
    const results = await Promise.all([
      approveTopUp({ topUpId: id, creditedCents: 6000 }),
      approveTopUp({ topUpId: id, creditedCents: 6000 }),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(await approveTopUp({ topUpId: id, creditedCents: 6000 })).toEqual({
      ok: false,
      error: "This top-up was already reviewed",
    });
    expect(await db.ledgerEntry.count({ where: { kind: "TOPUP" } })).toBe(1);
    expect(await balanceCents(db, ann.id)).toBe(6000);
  });

  it("rejects a non-positive credit", async () => {
    const id = await pendingTopUp();
    expect((await approveTopUp({ topUpId: id, creditedCents: 0 })).ok).toBe(false);
  });

  it("rejects with a required note and credits nothing", async () => {
    const id = await pendingTopUp();
    expect((await rejectTopUp({ topUpId: id, note: "" })).ok).toBe(false);
    expect((await rejectTopUp({ topUpId: id, note: "No such transaction to our address" })).ok).toBe(true);
    expect(await db.topUp.findUniqueOrThrow({ where: { id } })).toMatchObject({
      status: "REJECTED",
      adminNote: "No such transaction to our address",
    });
    expect(await db.ledgerEntry.count()).toBe(0);
    expect((await db.user.findUniqueOrThrow({ where: { id: ann.id } })).accountStatus).toBe("PENDING");
    expect(vi.mocked(sendEmail)).toHaveBeenCalledTimes(1);
  });

  it("re-checks a top-up against the chain", async () => {
    vi.mocked(lookupTx).mockResolvedValue(check({ found: false, error: "Explorer unavailable" }));
    const id = await pendingTopUp();
    vi.mocked(lookupTx).mockResolvedValue(check({ confirmations: 6 }));
    expect((await recheckTopUp(id)).ok).toBe(true);
    expect((await db.topUp.findUniqueOrThrow({ where: { id } })).chainCheck).toMatchObject({ found: true, confirmations: 6 });
  });

  it("suspending blocks booking and top-ups; unsuspending restores them", async () => {
    await db.user.update({ where: { id: ann.id }, data: { accountStatus: "APPROVED" } });
    await db.ledgerEntry.create({ data: { userId: ann.id, amountCents: 10000, kind: "ADJUSTMENT" } });
    expect((await setAccountStatus({ userId: ann.id, status: "SUSPENDED" })).ok).toBe(true);

    asUser(ann);
    expect((await submitTopUp({ coin: "BTC", amountCents: 6000, txHash: hash() })).ok).toBe(false);
    const q = await db.quote.create({
      data: {
        userId: ann.id,
        serviceType: "PARCEL",
        origin: nycAddress,
        destination: parisAddress,
        packages: smallBox,
        status: "PRICED",
        priceCents: 1000,
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    });
    expect((await acceptQuote(q.id)).ok).toBe(false);

    asUser(admin);
    await setAccountStatus({ userId: ann.id, status: "APPROVED" });
    asUser(ann);
    expect((await acceptQuote(q.id)).ok).toBe(true);
  });

  it("adjusts balances with a note and never below zero", async () => {
    expect((await adjustBalance({ userId: ann.id, amountCents: 2500, note: "" })).ok).toBe(false);
    expect((await adjustBalance({ userId: ann.id, amountCents: 2500, note: "Goodwill credit" })).ok).toBe(true);
    expect(await adjustBalance({ userId: ann.id, amountCents: -3000, note: "Correction" })).toEqual({
      ok: false,
      error: "That would make the balance negative",
    });
    expect((await adjustBalance({ userId: ann.id, amountCents: -2500, note: "Correction" })).ok).toBe(true);
    expect(await balanceCents(db, ann.id)).toBe(0);
    const rows = await db.ledgerEntry.findMany({ where: { userId: ann.id } });
    expect(rows.every((r) => r.createdById === admin.id && r.kind === "ADJUSTMENT")).toBe(true);
  });

  it("lists the review queue oldest first and counts it", async () => {
    const first = await pendingTopUp();
    const bob = await makeUser("bob@example.com");
    await pendingTopUp(bob);
    const queue = await listTopUpsToReview();
    expect(queue.map((t) => t.id)[0]).toBe(first);
    expect(queue[0].user.email).toBe("ann@example.com");
    expect((await getAdminCounts()).topUpsToReview).toBe(2);
  });

  it("lists customers with status and balance", async () => {
    await db.ledgerEntry.create({ data: { userId: ann.id, amountCents: 4200, kind: "ADJUSTMENT" } });
    const rows = await listCustomers();
    expect(rows.find((r) => r.id === ann.id)).toMatchObject({ accountStatus: "PENDING", balanceCents: 4200 });
  });

  it("refuses every funding action for customers", async () => {
    const id = await pendingTopUp();
    asUser(ann);
    const calls = [
      approveTopUp({ topUpId: id, creditedCents: 6000 }),
      rejectTopUp({ topUpId: id, note: "x" }),
      recheckTopUp(id),
      setAccountStatus({ userId: ann.id, status: "APPROVED" }),
      adjustBalance({ userId: ann.id, amountCents: 100, note: "x" }),
    ];
    for (const res of await Promise.all(calls)) expect(res).toEqual({ ok: false, error: "Not authorized" });
  });
});
