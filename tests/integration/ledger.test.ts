import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { balanceCents, debitForShipment, InsufficientBalanceError, refundShipment } from "@/server/ledger";
import { makeUser, nycAddress, parisAddress, resetDb } from "./helpers";

async function credit(userId: string, amountCents: number) {
  await db.ledgerEntry.create({ data: { userId, amountCents, kind: "ADJUSTMENT", note: "test" } });
}

async function shipmentFor(userId: string, n: number) {
  return db.shipment.create({
    data: {
      userId,
      trackingNumber: `SHP-LEDG${String(n).padStart(6, "2")}`,
      serviceType: "PARCEL",
      status: "BOOKED",
      priceCents: 1500,
      paymentMethod: "BALANCE",
      paymentStatus: "PAID",
      origin: nycAddress,
      destination: parisAddress,
    },
  });
}

describe("ledger", () => {
  let userId: string;

  beforeEach(async () => {
    await resetDb();
    userId = (await makeUser("ann@example.com")).id;
  });

  it("sums credits and debits into a balance", async () => {
    await credit(userId, 5000);
    await credit(userId, -1200);
    expect(await balanceCents(db, userId)).toBe(3800);
  });

  it("refuses a debit larger than the balance and writes nothing", async () => {
    await credit(userId, 1000);
    const s = await shipmentFor(userId, 1);
    const err = await db
      .$transaction((tx) => debitForShipment(tx, { userId, shipmentId: s.id, amountCents: 1500 }))
      .catch((e) => e);
    expect(err).toBeInstanceOf(InsufficientBalanceError);
    expect((err as InsufficientBalanceError).shortCents).toBe(500);
    expect(await db.ledgerEntry.count({ where: { kind: "BOOKING" } })).toBe(0);
  });

  it("writes one BOOKING debit when funds suffice", async () => {
    await credit(userId, 2000);
    const s = await shipmentFor(userId, 1);
    await db.$transaction((tx) => debitForShipment(tx, { userId, shipmentId: s.id, amountCents: 1500 }));
    const rows = await db.ledgerEntry.findMany({ where: { kind: "BOOKING" } });
    expect(rows).toEqual([expect.objectContaining({ amountCents: -1500, shipmentId: s.id })]);
    expect(await balanceCents(db, userId)).toBe(500);
  });

  it("refunds a balance-paid shipment exactly once", async () => {
    await credit(userId, 2000);
    const s = await shipmentFor(userId, 1);
    await db.$transaction((tx) => debitForShipment(tx, { userId, shipmentId: s.id, amountCents: 1500 }));
    expect(await db.$transaction((tx) => refundShipment(tx, s.id))).toBe(true);
    expect(await db.$transaction((tx) => refundShipment(tx, s.id))).toBe(false);
    expect(await db.ledgerEntry.count({ where: { kind: "REFUND" } })).toBe(1);
    expect(await balanceCents(db, userId)).toBe(2000);
    expect((await db.shipment.findUniqueOrThrow({ where: { id: s.id } })).paymentStatus).toBe("REFUNDED");
  });

  it("does not refund counter-paid shipments", async () => {
    const s = await shipmentFor(userId, 1);
    await db.shipment.update({ where: { id: s.id }, data: { paymentMethod: "COUNTER" } });
    expect(await db.$transaction((tx) => refundShipment(tx, s.id))).toBe(false);
  });
});
