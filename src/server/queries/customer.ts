import { db } from "../db";
import { getCurrentUser } from "../session";

export async function listMyQuotes() {
  const user = await getCurrentUser();
  if (!user) return [];
  return db.quote.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { shipment: { select: { id: true } } },
  });
}

export async function listMyShipments() {
  const user = await getCurrentUser();
  if (!user) return [];
  return db.shipment.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
}

export async function getMyShipment(id: string) {
  const user = await getCurrentUser();
  if (!user) return null;
  return db.shipment.findFirst({
    where: { id, userId: user.id },
    include: { events: { orderBy: { createdAt: "asc" } } },
  });
}
