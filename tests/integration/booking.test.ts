import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/server/db";
import { setPaymentStatus, updateShipmentStatus } from "@/server/actions/admin-shipments";
import { acceptQuote } from "@/server/actions/booking";
import { sendEmail } from "@/server/email";
import { geocodeCity } from "@/server/geocode";
import { balanceCents } from "@/server/ledger";
import { makeUser, nycAddress, parisAddress, resetDb, smallBox } from "./helpers";
import { asUser } from "./session-mock";

vi.mock("@/server/session", () => import("./session-mock"));
vi.mock("@/server/email", () => ({ sendEmail: vi.fn(async () => {}) }));
vi.mock("@/server/geocode", () => ({ geocodeCity: vi.fn(async () => null) }));

const DAY = 86_400_000;

async function approvedCustomer(email: string, fundsCents: number) {
  const u = await makeUser(email);
  await db.user.update({ where: { id: u.id }, data: { accountStatus: "APPROVED" } });
  if (fundsCents) await db.ledgerEntry.create({ data: { userId: u.id, amountCents: fundsCents, kind: "ADJUSTMENT" } });
  return u;
}

async function pricedQuote(userId: string, priceCents = 4300, over: { expiresAt?: Date; status?: "PRICED" | "PENDING_REVIEW" } = {}) {
  return db.quote.create({
    data: {
      userId,
      serviceType: "PARCEL",
      origin: nycAddress,
      destination: parisAddress,
      packages: smallBox,
      status: over.status ?? "PRICED",
      priceCents: over.status === "PENDING_REVIEW" ? null : priceCents,
      expiresAt: over.expiresAt ?? new Date(Date.now() + 7 * DAY),
    },
  });
}

describe("acceptQuote (balance)", () => {
  beforeEach(async () => {
    await resetDb();
    vi.clearAllMocks();
    vi.mocked(geocodeCity).mockResolvedValue(null);
  });

  it("refuses accounts that are not yet approved", async () => {
    const u = await makeUser("new@example.com");
    asUser(u);
    const q = await pricedQuote(u.id);
    expect(await acceptQuote(q.id)).toEqual({
      ok: false,
      error: "Your account is awaiting approval. Add funds to get started.",
    });
    expect(await db.shipment.count()).toBe(0);
  });

  it("tells the customer how much more they need", async () => {
    const u = await approvedCustomer("ann@example.com", 1000);
    asUser(u);
    const q = await pricedQuote(u.id, 4300);
    expect(await acceptQuote(q.id)).toEqual({ ok: false, error: "Insufficient balance: you need $33.00 more." });
    expect(await db.shipment.count()).toBe(0);
    expect((await db.quote.findUniqueOrThrow({ where: { id: q.id } })).status).toBe("PRICED");
  });

  it("books, debits the balance, and copies packages and weights", async () => {
    const u = await approvedCustomer("ann@example.com", 10000);
    asUser(u);
    const q = await pricedQuote(u.id, 4300);
    const res = await acceptQuote(q.id);
    if (!res.ok) throw new Error(res.error);
    const s = await db.shipment.findUniqueOrThrow({ where: { id: res.data.shipmentId }, include: { events: true } });
    expect(s).toMatchObject({
      status: "BOOKED",
      paymentMethod: "BALANCE",
      paymentStatus: "PAID",
      priceCents: 4300,
      userId: u.id,
      actualWeightKg: 3,
      chargeableWeightKg: 3,
    });
    expect(s.packages).toEqual(smallBox);
    expect(s.events.map((e) => e.status)).toEqual(["BOOKED"]);
    expect(await balanceCents(db, u.id)).toBe(5700);
    expect((await db.quote.findUniqueOrThrow({ where: { id: q.id } })).status).toBe("ACCEPTED");
    expect(vi.mocked(sendEmail)).toHaveBeenCalledTimes(1);
  });

  it("cannot overspend with two bookings at once", async () => {
    const u = await approvedCustomer("ann@example.com", 5000);
    asUser(u);
    const [q1, q2] = [await pricedQuote(u.id, 4300), await pricedQuote(u.id, 4300)];
    const results = await Promise.all([acceptQuote(q1.id), acceptQuote(q2.id)]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(await db.shipment.count()).toBe(1);
    expect(await balanceCents(db, u.id)).toBe(700);
  });

  it("creates one shipment when the same quote is accepted twice at once", async () => {
    const u = await approvedCustomer("ann@example.com", 20000);
    asUser(u);
    const q = await pricedQuote(u.id);
    const results = await Promise.all([acceptQuote(q.id), acceptQuote(q.id)]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(await db.shipment.count()).toBe(1);
    expect(await balanceCents(db, u.id)).toBe(20000 - 4300);
  });

  it("rejects expired, unpriced and other customers' quotes", async () => {
    const u = await approvedCustomer("ann@example.com", 20000);
    asUser(u);
    const expired = await pricedQuote(u.id, 4300, { expiresAt: new Date(Date.now() - 1000) });
    expect(await acceptQuote(expired.id)).toEqual({ ok: false, error: "Quote has expired" });
    const pending = await pricedQuote(u.id, 0, { status: "PENDING_REVIEW" });
    expect((await acceptQuote(pending.id)).ok).toBe(false);
    const other = await approvedCustomer("bob@example.com", 20000);
    const theirs = await pricedQuote(other.id);
    expect(await acceptQuote(theirs.id)).toEqual({ ok: false, error: "Not found" });
    expect(await balanceCents(db, u.id)).toBe(20000);
  });

  it("refuses suspended accounts", async () => {
    const u = await approvedCustomer("ann@example.com", 20000);
    await db.user.update({ where: { id: u.id }, data: { accountStatus: "SUSPENDED" } });
    asUser(u);
    const q = await pricedQuote(u.id);
    expect(await acceptQuote(q.id)).toEqual({ ok: false, error: "Your account is suspended. Please contact support." });
  });
});

describe("cancellation refunds", () => {
  beforeEach(async () => {
    await resetDb();
    vi.clearAllMocks();
  });

  it("refunds a balance booking to the customer when an admin cancels it", async () => {
    const u = await approvedCustomer("ann@example.com", 10000);
    asUser(u);
    const res = await acceptQuote((await pricedQuote(u.id, 4300)).id);
    if (!res.ok) throw new Error(res.error);
    asUser(await makeUser("ops@example.com", "ADMIN"));

    expect((await updateShipmentStatus({ shipmentId: res.data.shipmentId, status: "CANCELLED", location: "Office" })).ok).toBe(
      true,
    );
    expect(await balanceCents(db, u.id)).toBe(10000);
    expect((await db.shipment.findUniqueOrThrow({ where: { id: res.data.shipmentId } })).paymentStatus).toBe("REFUNDED");

    // A second cancel is blocked by the status rules; still exactly one refund.
    expect((await updateShipmentStatus({ shipmentId: res.data.shipmentId, status: "CANCELLED", location: "Office" })).ok).toBe(
      false,
    );
    expect(await db.ledgerEntry.count({ where: { kind: "REFUND" } })).toBe(1);
  });

  it("does not let admins toggle payment on balance bookings", async () => {
    const u = await approvedCustomer("ann@example.com", 10000);
    asUser(u);
    const res = await acceptQuote((await pricedQuote(u.id)).id);
    if (!res.ok) throw new Error(res.error);
    asUser(await makeUser("ops@example.com", "ADMIN"));
    expect(await setPaymentStatus({ shipmentId: res.data.shipmentId, paymentStatus: "UNPAID" })).toEqual({
      ok: false,
      error: "Payment for balance bookings is managed by the ledger",
    });
  });
});
