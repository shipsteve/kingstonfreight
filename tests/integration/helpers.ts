import { db } from "@/server/db";
import { resetRateLimits } from "@/server/rate-limit";

export async function resetDb() {
  resetRateLimits();
  await db.$executeRawUnsafe(
    'TRUNCATE "TrackingEvent", "Shipment", "Quote", "ParcelRate", "CourierRate", "Zone", "User" RESTART IDENTITY CASCADE',
  );
}

export async function makeUser(email: string, role: "CUSTOMER" | "ADMIN" = "CUSTOMER") {
  const u = await db.user.create({ data: { email, name: email.split("@")[0], passwordHash: "x", role } });
  return { id: u.id, email: u.email, role: u.role };
}

export const nycAddress = {
  name: "Ann Sender",
  line1: "1 Main St",
  city: "New York",
  postcode: "10001",
  countryCode: "US",
};

export const laAddress = { ...nycAddress, name: "Bob Receiver", city: "Los Angeles", postcode: "90001" };

export const parisAddress = {
  name: "Claire Receiver",
  line1: "2 Rue de Rivoli",
  city: "Paris",
  postcode: "75001",
  countryCode: "FR",
};

export const smallBox = [{ weightKg: 3, lengthCm: 20, widthCm: 20, heightCm: 20, qty: 1 }];
