"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { lookupTx } from "../chain";
import { db } from "../db";
import { sendEmail } from "../email";
import { accountApprovedEmail, topUpApprovedEmail, topUpRejectedEmail } from "../email-templates";
import { balanceCents, lockUser } from "../ledger";
import { fail, ok, type ActionResult } from "../result";
import { requireAdmin } from "../session";
import { guarded } from "./guard";
import { safeRevalidate } from "./revalidate";

const refresh = () => {
  safeRevalidate(revalidatePath, "/admin/funding");
  safeRevalidate(revalidatePath, "/admin/customers");
};

const ALREADY_REVIEWED = "This top-up was already reviewed";

const approveSchema = z.object({ topUpId: z.string().min(1), creditedCents: z.number().int().positive("Enter an amount above zero") });

/** Credits a verified top-up once; a customer's first approved top-up also approves their account. */
export async function approveTopUp(input: z.input<typeof approveSchema>): Promise<ActionResult<{ id: string }>> {
  return guarded(async () => {
    const admin = await requireAdmin();
    const parsed = approveSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    const { topUpId, creditedCents } = parsed.data;

    const result = await db.$transaction(async (tx) => {
      const { count } = await tx.topUp.updateMany({
        where: { id: topUpId, status: "PENDING_REVIEW" },
        data: { status: "APPROVED", creditedCents, reviewedById: admin.id, reviewedAt: new Date() },
      });
      if (count !== 1) return null;
      const topUp = await tx.topUp.findUniqueOrThrow({ where: { id: topUpId }, include: { user: true } });
      await tx.ledgerEntry.create({
        data: { userId: topUp.userId, amountCents: creditedCents, kind: "TOPUP", topUpId, createdById: admin.id },
      });
      const approved = await tx.user.updateMany({
        where: { id: topUp.userId, accountStatus: "PENDING" },
        data: { accountStatus: "APPROVED", approvedAt: new Date(), approvedById: admin.id },
      });
      return { topUp, newlyApproved: approved.count === 1, balance: await balanceCents(tx, topUp.userId) };
    });
    if (!result) return fail((await db.topUp.findUnique({ where: { id: topUpId } })) ? ALREADY_REVIEWED : "Not found");

    const to = result.topUp.user.email;
    await sendEmail({ to, ...topUpApprovedEmail({ creditedCents, balanceCents: result.balance }) });
    if (result.newlyApproved) await sendEmail({ to, ...accountApprovedEmail() });
    refresh();
    return ok({ id: topUpId });
  });
}

const rejectSchema = z.object({ topUpId: z.string().min(1), note: z.string().trim().min(1, "Add a reason").max(1000) });

export async function rejectTopUp(input: z.input<typeof rejectSchema>): Promise<ActionResult<{ id: string }>> {
  return guarded(async () => {
    const admin = await requireAdmin();
    const parsed = rejectSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    const { topUpId, note } = parsed.data;
    const { count } = await db.topUp.updateMany({
      where: { id: topUpId, status: "PENDING_REVIEW" },
      data: { status: "REJECTED", adminNote: note, reviewedById: admin.id, reviewedAt: new Date() },
    });
    if (count !== 1) return fail(ALREADY_REVIEWED);
    const t = await db.topUp.findUniqueOrThrow({ where: { id: topUpId }, include: { user: true } });
    await sendEmail({ to: t.user.email, ...topUpRejectedEmail({ coin: t.coin, amountCents: t.requestedCents, note }) });
    refresh();
    return ok({ id: topUpId });
  });
}

export async function recheckTopUp(topUpId: string): Promise<ActionResult<{ id: string }>> {
  return guarded(async () => {
    await requireAdmin();
    const t = await db.topUp.findUnique({ where: { id: topUpId } });
    if (!t) return fail("Not found");
    await db.topUp.update({ where: { id: t.id }, data: { chainCheck: await lookupTx(t.coin, t.txHash) } });
    refresh();
    return ok({ id: t.id });
  });
}

const statusSchema = z.object({ userId: z.string().min(1), status: z.enum(["APPROVED", "SUSPENDED"]) });

/** Approve (or un-suspend) and suspend customer accounts. */
export async function setAccountStatus(input: z.input<typeof statusSchema>): Promise<ActionResult<{ id: string }>> {
  return guarded(async () => {
    const admin = await requireAdmin();
    const parsed = statusSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    const { userId, status } = parsed.data;
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== "CUSTOMER") return fail("Not found");
    await db.user.update({
      where: { id: userId },
      data:
        status === "APPROVED" && !user.approvedAt
          ? { accountStatus: status, approvedAt: new Date(), approvedById: admin.id }
          : { accountStatus: status },
    });
    if (status === "APPROVED" && user.accountStatus === "PENDING") {
      await sendEmail({ to: user.email, ...accountApprovedEmail() });
    }
    refresh();
    return ok({ id: userId });
  });
}

const adjustSchema = z.object({
  userId: z.string().min(1),
  amountCents: z
    .number()
    .int()
    .refine((n) => n !== 0, "Enter a non-zero amount"),
  note: z.string().trim().min(1, "A note is required for adjustments").max(500),
});

export async function adjustBalance(input: z.input<typeof adjustSchema>): Promise<ActionResult<{ id: string }>> {
  return guarded(async () => {
    const admin = await requireAdmin();
    const parsed = adjustSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    const { userId, amountCents, note } = parsed.data;
    const res = await db.$transaction(async (tx) => {
      await lockUser(tx, userId);
      if ((await balanceCents(tx, userId)) + amountCents < 0) return null;
      return tx.ledgerEntry.create({
        data: { userId, amountCents, kind: "ADJUSTMENT", note, createdById: admin.id },
      });
    });
    if (!res) return fail("That would make the balance negative");
    refresh();
    return ok({ id: res.id });
  });
}
