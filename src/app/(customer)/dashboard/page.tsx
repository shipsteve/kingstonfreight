import { ArrowRight, Package } from "lucide-react";
import Link from "next/link";
import { ScheduleLine } from "@/components/shipment/ScheduleLine";
import { QuoteStatusBadge, StatusBadge } from "@/components/shipment/StatusBadge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { asAddress, shortPlace } from "@/lib/address";
import { formatMoney } from "@/lib/money";
import { getMyAccount, listMyQuotes, listMyShipments } from "@/server/queries/customer";

export const metadata = { title: "Dashboard" };

const SERVICE_LABEL = { PARCEL: "Parcel", COURIER: "Courier", FREIGHT: "Freight" } as const;
const dateFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

export default async function DashboardPage() {
  const [shipments, quotes, account] = await Promise.all([listMyShipments(), listMyQuotes(), getMyAccount()]);
  const openQuotes = quotes.filter((q) => q.status !== "ACCEPTED");

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-10 px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Your shipments</h1>
          <p className="text-muted-foreground">Track bookings and pick up where you left off.</p>
        </div>
        <Link href="/quote" className={buttonVariants()}>
          New quote <ArrowRight />
        </Link>
      </div>

      {account?.accountStatus === "PENDING" && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm"
        >
          <p>
            <span className="font-medium">Your account is pending approval.</span> Add funds to your wallet; once we
            verify your first payment you can book shipments.
          </p>
          <Link href="/account/wallet" className={buttonVariants({ size: "sm" })}>
            Add funds
          </Link>
        </div>
      )}

      <section aria-labelledby="shipments-heading" className="space-y-3">
        <h2 id="shipments-heading" className="text-lg font-medium">
          Shipments
        </h2>
        {shipments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <Package className="size-8 text-muted-foreground" />
              <p className="text-muted-foreground">No shipments yet. Get a quote to book your first one.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {shipments.map((s) => (
              <Link key={s.id} href={`/shipments/${s.id}`}>
                <Card className="transition-colors hover:border-primary">
                  <CardContent className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm font-medium">{s.trackingNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {shortPlace(asAddress(s.origin))} → {shortPlace(asAddress(s.destination))}
                      </p>
                      <ScheduleLine
                        className="mt-1 text-muted-foreground"
                        departureDate={s.departureDate}
                        estimatedArrival={s.estimatedArrival}
                        transportMode={s.transportMode}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">{SERVICE_LABEL[s.serviceType]}</span>
                      <StatusBadge status={s.status} />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {openQuotes.length > 0 && (
        <section aria-labelledby="quotes-heading" className="space-y-3">
          <h2 id="quotes-heading" className="text-lg font-medium">
            Quotes
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {openQuotes.map((q) => (
              <Link key={q.id} href={`/quotes/${q.id}`}>
                <Card className="h-full transition-colors hover:border-primary">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base">{SERVICE_LABEL[q.serviceType]}</CardTitle>
                      <QuoteStatusBadge status={q.status} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <p className="text-muted-foreground">
                      {shortPlace(asAddress(q.origin))} → {shortPlace(asAddress(q.destination))}
                    </p>
                    <p>
                      {q.priceCents != null ? formatMoney(q.priceCents) : "Price pending"} ·{" "}
                      {dateFmt.format(q.createdAt)}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
