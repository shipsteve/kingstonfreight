import type { AccountStatus, Prisma, PrismaClient } from "@prisma/client";

type Client = Prisma.TransactionClient | PrismaClient;

/** Balance is never stored: it is the sum of the user's append-only ledger. */
export async function balanceCents(client: Client, userId: string): Promise<number> {
  const { _sum } = await client.ledgerEntry.aggregate({ where: { userId }, _sum: { amountCents: true } });
  return _sum.amountCents ?? 0;
}

/**
 * Row-locks the user for the rest of the transaction so concurrent debits for the same
 * customer run one after another (the second sees the first's debit).
 */
export async function lockUser(tx: Prisma.TransactionClient, userId: string): Promise<{ accountStatus: AccountStatus }> {
  const rows = await tx.$queryRaw<{ accountStatus: AccountStatus }[]>`
    SELECT "accountStatus" FROM "User" WHERE id = ${userId} FOR UPDATE`;
  if (!rows[0]) throw new Error("User not found");
  return rows[0];
}

export class InsufficientBalanceError extends Error {
  constructor(public shortCents: number) {
    super("Insufficient balance");
  }
}

/** Debits a booking. Throws InsufficientBalanceError (and writes nothing) when funds are short. */
export async function debitForShipment(
  tx: Prisma.TransactionClient,
  { userId, shipmentId, amountCents }: { userId: string; shipmentId: string; amountCents: number },
): Promise<void> {
  await lockUser(tx, userId);
  const balance = await balanceCents(tx, userId);
  if (balance < amountCents) throw new InsufficientBalanceError(amountCents - balance);
  await tx.ledgerEntry.create({ data: { userId, amountCents: -amountCents, kind: "BOOKING", shipmentId } });
}

/** Credits back a balance-paid booking once. Returns false if there is nothing (more) to refund. */
export async function refundShipment(tx: Prisma.TransactionClient, shipmentId: string): Promise<boolean> {
  const booking = await tx.ledgerEntry.findUnique({ where: { shipmentId_kind: { shipmentId, kind: "BOOKING" } } });
  if (!booking) return false;
  const { count } = await tx.shipment.updateMany({
    where: { id: shipmentId, paymentMethod: "BALANCE", paymentStatus: "PAID" },
    data: { paymentStatus: "REFUNDED" },
  });
  if (count !== 1) return false;
  await tx.ledgerEntry.create({
    data: { userId: booking.userId, amountCents: -booking.amountCents, kind: "REFUND", shipmentId },
  });
  return true;
}
