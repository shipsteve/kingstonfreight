import { db } from "@/server/db";

export async function resetDb() {
  await db.$executeRawUnsafe(
    'TRUNCATE "TrackingEvent", "Shipment", "Quote", "ParcelRate", "CourierRate", "Zone", "User" RESTART IDENTITY CASCADE',
  );
}
