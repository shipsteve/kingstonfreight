"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { formatMoney } from "@/lib/money";
import { addressFor, walletConfig } from "@/lib/wallet-config";
import { isTxHash, lookupTx, normalizeTxHash } from "../chain";
import { db } from "../db";
import { sendEmail } from "../email";
import { topUpReceivedEmail } from "../email-templates";
import { rateLimit } from "../rate-limit";
import { fail, ok, type ActionResult } from "../result";
import { requireUser } from "../session";
import { guarded } from "./guard";
import { safeRevalidate } from "./revalidate";

const schema = z.object({
  coin: z.enum(["BTC", "LTC"]),
  amountCents: z.number().int().positive(),
  txHash: z.string().transform(normalizeTxHash).refine(isTxHash, "Enter the 64-character transaction ID"),
});

/** Customer reports a payment sent to our address. Always goes to admin review; the explorer check is a hint. */
export async function submitTopUp(input: z.input<typeof schema>): Promise<ActionResult<{ id: string }>> {
  return guarded(async () => {
    const user = await requireUser();
    const parsed = schema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    const { coin, amountCents, txHash } = parsed.data;

    const { minTopUpCents } = walletConfig();
    if (amountCents < minTopUpCents) return fail(`Minimum top-up is ${formatMoney(minTopUpCents)}`);
    if (!addressFor(coin)) return fail(`${coin} payments aren't available right now`);

    const account = await db.user.findUnique({ where: { id: user.id }, select: { accountStatus: true } });
    if (account?.accountStatus === "SUSPENDED") return fail("Your account is suspended. Please contact support.");

    if (await db.topUp.findUnique({ where: { coin_txHash: { coin, txHash } } })) {
      return fail("This transaction has already been submitted");
    }
    if (!rateLimit(`topup:${user.id}`, 10, 60 * 60_000)) return fail("Too many submissions. Please try again later.");

    const chainCheck = await lookupTx(coin, txHash);
    try {
      const topUp = await db.topUp.create({
        data: { userId: user.id, coin, txHash, requestedCents: amountCents, chainCheck },
      });
      await sendEmail({ to: user.email, ...topUpReceivedEmail({ coin, amountCents }) });
      safeRevalidate(revalidatePath, "/account/wallet");
      return ok({ id: topUp.id });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return fail("This transaction has already been submitted");
      }
      throw e;
    }
  });
}
