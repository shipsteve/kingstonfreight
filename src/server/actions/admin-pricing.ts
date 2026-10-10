"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "../db";
import { fail, ok, type ActionResult } from "../result";
import { requireAdmin } from "../session";
import { guarded } from "./guard";
import { safeRevalidate } from "./revalidate";

const refresh = () => safeRevalidate(revalidatePath, "/admin/pricing");

const zoneSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Name is required").max(100),
  kind: z.enum(["DOMESTIC", "INTERNATIONAL"]),
  postcodePrefixes: z.array(z.string().trim().min(1).max(20).transform((p) => p.replace(/\s+/g, "").toUpperCase())),
  countryCodes: z.array(
    z
      .string()
      .trim()
      .regex(/^[A-Za-z]{2}$/, "Country codes must be 2 letters")
      .transform((c) => c.toUpperCase()),
  ),
});

export async function upsertZone(input: z.input<typeof zoneSchema>): Promise<ActionResult<{ id: string }>> {
  return guarded(async () => {
    await requireAdmin();
    const parsed = zoneSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    const { id, ...data } = parsed.data;
    try {
      const zone = id ? await db.zone.update({ where: { id }, data }) : await db.zone.create({ data });
      refresh();
      return ok({ id: zone.id });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return fail("A zone with that name exists");
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") return fail("Not found");
      throw e;
    }
  });
}

export async function deleteZone(id: string): Promise<ActionResult<{ id: string }>> {
  return guarded(async () => {
    await requireAdmin();
    const rates = await db.parcelRate.count({ where: { OR: [{ originZoneId: id }, { destZoneId: id }] } });
    if (rates > 0) return fail("Zone has rates; delete them first");
    const { count } = await db.zone.deleteMany({ where: { id } });
    if (count !== 1) return fail("Not found");
    refresh();
    return ok({ id });
  });
}

const rateSchema = z.object({
  originZoneId: z.string().min(1),
  destZoneId: z.string().min(1),
  maxWeightKg: z.number().positive().max(10_000),
  priceCents: z.number().int().nonnegative("Price can't be negative"),
});

export async function upsertParcelRate(input: z.input<typeof rateSchema>): Promise<ActionResult<{ id: string }>> {
  return guarded(async () => {
    await requireAdmin();
    const parsed = rateSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    const { originZoneId, destZoneId, maxWeightKg, priceCents } = parsed.data;
    try {
      const rate = await db.parcelRate.upsert({
        where: { originZoneId_destZoneId_maxWeightKg: { originZoneId, destZoneId, maxWeightKg } },
        update: { priceCents },
        create: parsed.data,
      });
      refresh();
      return ok({ id: rate.id });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") return fail("Unknown zone");
      throw e;
    }
  });
}

export async function deleteParcelRate(id: string): Promise<ActionResult<{ id: string }>> {
  return guarded(async () => {
    await requireAdmin();
    const { count } = await db.parcelRate.deleteMany({ where: { id } });
    if (count !== 1) return fail("Not found");
    refresh();
    return ok({ id });
  });
}

const courierSchema = z.object({
  baseFeeCents: z.number().int().nonnegative(),
  perKmCents: z.number().int().nonnegative(),
  maxKm: z.number().positive(),
});

export async function updateCourierRate(input: z.input<typeof courierSchema>): Promise<ActionResult<{ id: string }>> {
  return guarded(async () => {
    await requireAdmin();
    const parsed = courierSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    await db.courierRate.upsert({
      where: { id: "singleton" },
      update: parsed.data,
      create: { id: "singleton", ...parsed.data },
    });
    refresh();
    return ok({ id: "singleton" });
  });
}
