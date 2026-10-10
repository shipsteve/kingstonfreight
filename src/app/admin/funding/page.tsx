import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { TopUpReview } from "@/components/admin/TopUpReview";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import type { ChainCheck } from "@/server/chain";
import { explorerTxUrl } from "@/server/chain";
import { listTopUpsToReview } from "@/server/queries/admin";

export const metadata = { title: "Funding" };

const dateFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

/** One-line verdict an admin can act on, from the stored explorer check. */
function verdict(coin: "BTC" | "LTC", requestedCents: number, c: ChainCheck | null): { ok: boolean; text: string } {
  if (!c) return { ok: false, text: "Not checked yet. Use Re-check." };
  if (!c.found) return { ok: false, text: c.error ?? "Transaction not found" };
  if (c.paidToUsSats === 0) return { ok: false, text: "Transaction found, but nothing was paid to our address" };
  const amount = `${(c.paidToUsSats / 1e8).toFixed(8).replace(/0+$/, "").replace(/\.$/, "")} ${coin} to our address`;
  const confs =
    c.confirmations === 0 ? "unconfirmed" : `${c.confirmations} confirmation${c.confirmations === 1 ? "" : "s"}`;
  const usd = c.usdEstimateCents != null ? ` · ≈ ${formatMoney(c.usdEstimateCents)}` : "";
  const short = c.usdEstimateCents != null && c.usdEstimateCents < requestedCents * 0.97;
  return {
    ok: c.confirmations > 0 && !short,
    text: `${amount} · ${confs}${usd}${short ? " · less than requested" : ""}`,
  };
}

export default async function FundingPage() {
  const queue = await listTopUpsToReview();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Funding</h1>
        <p className="text-muted-foreground">
          Verify each payment on the blockchain before crediting it. A customer&apos;s first approved top-up also
          approves their account.
        </p>
      </div>
      {queue.length === 0 && <p className="text-muted-foreground">No payments waiting for review.</p>}
      <div className="grid gap-4">
        {queue.map((t) => {
          const check = t.chainCheck as ChainCheck | null;
          const v = verdict(t.coin, t.requestedCents, check);
          const suggested =
            check?.usdEstimateCents != null ? Math.min(t.requestedCents, check.usdEstimateCents) : t.requestedCents;
          return (
            <Card key={t.id}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  {formatMoney(t.requestedCents)} in {t.coin}
                  {t.user.accountStatus === "PENDING" && (
                    <Badge variant="secondary">First top-up · approves account</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {t.user.name} ({t.user.email}) · submitted {dateFmt.format(t.createdAt)}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 lg:grid-cols-[1fr_minmax(280px,340px)]">
                <div className="space-y-3 text-sm">
                  <p className="break-all font-mono text-xs">{t.txHash}</p>
                  <p
                    className={`flex items-start gap-2 ${v.ok ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}
                  >
                    {v.ok ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                    ) : (
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    )}
                    {v.text}
                  </p>
                  {check?.checkedAt && (
                    <p className="text-xs text-muted-foreground">Checked {dateFmt.format(new Date(check.checkedAt))}</p>
                  )}
                </div>
                <TopUpReview
                  topUpId={t.id}
                  defaultCreditCents={suggested}
                  explorerUrl={explorerTxUrl(t.coin, t.txHash)}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
