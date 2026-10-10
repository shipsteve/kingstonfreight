import { PrismaClient, type ZoneKind } from "@prisma/client";
import bcrypt from "bcryptjs";

const ZONES: { name: string; kind: ZoneKind; postcodePrefixes: string[]; countryCodes: string[] }[] = [
  { name: "US-East", kind: "DOMESTIC", postcodePrefixes: ["0", "1", "2", "3", "4"], countryCodes: [] },
  { name: "US-West", kind: "DOMESTIC", postcodePrefixes: ["5", "6", "7", "8", "9"], countryCodes: [] },
  { name: "Europe", kind: "INTERNATIONAL", postcodePrefixes: [], countryCodes: ["GB", "FR", "DE", "NL", "ES", "IT"] },
  { name: "Asia", kind: "INTERNATIONAL", postcodePrefixes: [], countryCodes: ["CN", "JP", "SG", "IN"] },
  // Empty country list = fallback for any country not in another international zone.
  { name: "Rest of World", kind: "INTERNATIONAL", postcodePrefixes: [], countryCodes: [] },
];

const BANDS_KG = [0.5, 1, 2, 5, 10, 20, 30];

function bandPrice(origin: ZoneKind, dest: ZoneKind, sameZone: boolean, maxKg: number): number {
  const domestic = origin === "DOMESTIC" && dest === "DOMESTIC";
  const base = sameZone ? 600 : domestic ? 900 : 2500;
  const perKg = domestic ? 120 : 600;
  return Math.round(base + perKg * maxKg);
}

export async function seed(db: PrismaClient) {
  // No defaults: a seeded admin with a known password would be an open door in production.
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD before seeding");
  if (password.length < 8) throw new Error("ADMIN_PASSWORD must be at least 8 characters");
  await db.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Admin",
      role: "ADMIN",
      accountStatus: "APPROVED",
      approvedAt: new Date(),
      passwordHash: await bcrypt.hash(password, 10),
    },
  });

  const zones = [];
  for (const z of ZONES) {
    zones.push(await db.zone.upsert({ where: { name: z.name }, update: {}, create: z }));
  }

  for (const o of zones) {
    for (const d of zones) {
      for (const maxWeightKg of BANDS_KG) {
        await db.parcelRate.upsert({
          where: { originZoneId_destZoneId_maxWeightKg: { originZoneId: o.id, destZoneId: d.id, maxWeightKg } },
          update: {},
          create: {
            originZoneId: o.id,
            destZoneId: d.id,
            maxWeightKg,
            priceCents: bandPrice(o.kind, d.kind, o.id === d.id, maxWeightKg),
          },
        });
      }
    }
  }

  await db.courierRate.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", baseFeeCents: 1500, perKmCents: 150, maxKm: 100 },
  });
}
