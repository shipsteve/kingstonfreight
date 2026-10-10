import { db } from "../db";
import { balanceCents } from "../ledger";
import { getCurrentUser } from "../session";

export async function getMyWallet() {
  const user = await getCurrentUser();
  if (!user) return null;
  const [account, balance, topUps, ledger] = await Promise.all([
    db.user.findUnique({ where: { id: user.id }, select: { accountStatus: true } }),
    balanceCents(db, user.id),
    db.topUp.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    db.ledgerEntry.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { shipment: { select: { trackingNumber: true } } },
    }),
  ]);
  if (!account) return null;
  return { accountStatus: account.accountStatus, balanceCents: balance, topUps, ledger };
}
