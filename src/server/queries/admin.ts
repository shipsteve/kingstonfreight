import type { Prisma, ShipmentStatus } from "@prisma/client";
import { db } from "../db";
import { loadPricingContext, suggestPrice } from "../rates";
import { requireAdmin } from "../session";

const MOVING: ShipmentStatus[] = ["PICKED_UP", "IN_TRANSIT", "CUSTOMS", "OUT_FOR_DELIVERY"];

export async function getAdminCounts() {
  await requireAdmin();
  const [pendingQuotes, topUpsToReview, inTransit, exceptions] = await Promise.all([
    db.quote.count({ where: { status: "PENDING_REVIEW" } }),
    db.topUp.count({ where: { status: "PENDING_REVIEW" } }),
    db.shipment.count({ where: { status: { in: MOVING } } }),
    db.shipment.count({ where: { status: "EXCEPTION" } }),
  ]);
  return { pendingQuotes, topUpsToReview, inTransit, exceptions };
}

export async function listQuotesToPrice() {
  await requireAdmin();
  const [quotes, ctx] = await Promise.all([
    db.quote.findMany({
      where: { status: "PENDING_REVIEW" },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { email: true, name: true } } },
    }),
    loadPricingContext(),
  ]);
  return quotes.map((q) => ({ ...q, suggestedCents: suggestPrice(q, ctx) }));
}

export async function listShipments(filter: { status?: ShipmentStatus; q?: string }) {
  await requireAdmin();
  const where: Prisma.ShipmentWhereInput = {};
  if (filter.status) where.status = filter.status;
  const q = filter.q?.trim();
  if (q) {
    where.OR = [
      { trackingNumber: { contains: q.toUpperCase() } },
      { user: { email: { contains: q.toLowerCase() } } },
    ];
  }
  return db.shipment.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { email: true } } },
  });
}

export async function getShipmentForAdmin(id: string) {
  await requireAdmin();
  return db.shipment.findUnique({
    where: { id },
    include: { user: true, events: { orderBy: { createdAt: "asc" } }, quote: true },
  });
}

export async function getPricingData() {
  await requireAdmin();
  const [zones, rates, courier] = await Promise.all([
    db.zone.findMany({ orderBy: { name: "asc" } }),
    db.parcelRate.findMany({ orderBy: { maxWeightKg: "asc" } }),
    db.courierRate.findUnique({ where: { id: "singleton" } }),
  ]);
  return { zones, rates, courier };
}

export async function listCustomers() {
  await requireAdmin();
  const users = await db.user.findMany({
    where: { role: "CUSTOMER" },
    orderBy: { createdAt: "desc" },
    take: 500,
    include: { _count: { select: { shipments: true, quotes: true } } },
  });
  const sums = await db.ledgerEntry.groupBy({
    by: ["userId"],
    where: { userId: { in: users.map((u) => u.id) } },
    _sum: { amountCents: true },
  });
  const balance = new Map(sums.map((s) => [s.userId, s._sum.amountCents ?? 0]));
  return users.map((u) => ({ ...u, balanceCents: balance.get(u.id) ?? 0 }));
}

export async function listTopUpsToReview() {
  await requireAdmin();
  return db.topUp.findMany({
    where: { status: "PENDING_REVIEW" },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, email: true, name: true, accountStatus: true } } },
  });
}
