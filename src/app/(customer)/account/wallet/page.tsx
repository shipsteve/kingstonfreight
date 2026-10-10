import { CheckCircle2, Clock, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddFundsForm, type CoinOption } from "@/components/wallet/AddFundsForm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/lib/money";
import { paymentUri, walletConfig } from "@/lib/wallet-config";
import { explorerTxUrl, usdPerCoin } from "@/server/chain";
import { qrSvg } from "@/server/qr";
import { getMyWallet } from "@/server/queries/wallet";

export const metadata = { title: "Wallet" };

const dateFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });
const TOPUP_STATUS = {
  PENDING_REVIEW: { label: "Under review", className: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  APPROVED: { label: "Added", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  REJECTED: { label: "Rejected", className: "bg-red-500/15 text-red-700 dark:text-red-300" },
} as const;
const LEDGER_LABEL = { TOPUP: "Top-up", BOOKING: "Booking", REFUND: "Refund", ADJUSTMENT: "Adjustment" } as const;

export default async function WalletPage() {
  const wallet = await getMyWallet();
  if (!wallet) notFound();
  const { coins, minTopUpCents } = walletConfig();
  const options: CoinOption[] = await Promise.all(
    coins.map(async (c) => ({
      ...c,
      qrSvg: await qrSvg(paymentUri(c.coin, c.address)),
      usdPrice: await usdPerCoin(c.coin),
    })),
  );

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-8 px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Wallet</h1>
          <p className="text-muted-foreground">Prepay with Bitcoin or Litecoin. Bookings are paid from this balance.</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Balance</p>
          <p className="text-4xl font-semibold tabular-nums" data-testid="balance">
            {formatMoney(wallet.balanceCents)}
          </p>
        </div>
      </div>

      {wallet.accountStatus === "PENDING" && (
        <div role="status" className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          <Clock className="size-5 shrink-0 text-amber-600" />
          <p>
            <span className="font-medium">Your account is pending approval.</span> Add funds below; once our team verifies
            your first payment, your account is approved and you can book shipments.
          </p>
        </div>
      )}
      {wallet.accountStatus === "APPROVED" && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="size-4" /> Account approved
        </div>
      )}
      {wallet.accountStatus === "SUSPENDED" && (
        <div role="alert" className="flex gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm">
          <ShieldAlert className="size-5 shrink-0 text-red-600" />
          <p>Your account is suspended, so new payments and bookings are paused. Please contact support.</p>
        </div>
      )}

      {wallet.accountStatus !== "SUSPENDED" && (
        <Card>
          <CardHeader>
            <CardTitle>Add funds</CardTitle>
            <CardDescription>
              Every payment is checked by our team before it&apos;s added, usually within a few hours. See our{" "}
              <Link href="/refunds" className="underline underline-offset-4">
                refund policy
              </Link>
              .
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AddFundsForm coins={options} minTopUpCents={minTopUpCents} />
          </CardContent>
        </Card>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Payments</h2>
        {wallet.topUps.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments yet.</p>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Coin</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Transaction</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wallet.topUps.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{dateFmt.format(t.createdAt)}</TableCell>
                    <TableCell>{t.coin}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(t.creditedCents ?? t.requestedCents)}
                    </TableCell>
                    <TableCell>
                      <Badge className={`border-transparent ${TOPUP_STATUS[t.status].className}`}>
                        {TOPUP_STATUS[t.status].label}
                      </Badge>
                      {t.status === "REJECTED" && t.adminNote && (
                        <p className="mt-1 text-xs text-muted-foreground">{t.adminNote}</p>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <a
                        href={explorerTxUrl(t.coin, t.txHash)}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-xs underline-offset-4 hover:underline"
                      >
                        {t.txHash.slice(0, 10)}…{t.txHash.slice(-6)}
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Balance history</h2>
        {wallet.ledger.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wallet.ledger.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{dateFmt.format(e.createdAt)}</TableCell>
                    <TableCell>
                      {LEDGER_LABEL[e.kind]}
                      {e.shipment && <span className="font-mono text-xs"> · {e.shipment.trackingNumber}</span>}
                      {e.note && <span className="text-muted-foreground"> · {e.note}</span>}
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums ${e.amountCents < 0 ? "" : "text-emerald-700 dark:text-emerald-400"}`}
                    >
                      {e.amountCents < 0 ? "−" : "+"}
                      {formatMoney(Math.abs(e.amountCents))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </main>
  );
}
