import Link from "next/link";
import { notFound } from "next/navigation";
import { AcceptQuoteButton } from "@/components/shipment/PaymentButtons";
import { QuoteStatusBadge } from "@/components/shipment/StatusBadge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { asAddress } from "@/lib/address";
import { countryName } from "@/lib/geo/countries";
import { formatMoney } from "@/lib/money";
import type { Address, PackageInput } from "@/lib/pricing/types";
import { getMyQuote } from "@/server/actions/quotes";

export const metadata = { title: "Quote" };

const SERVICE_LABEL = { PARCEL: "Parcel", COURIER: "Local courier", FREIGHT: "Freight" } as const;
const dateFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

function AddressBlock({ title, a }: { title: string; a: Address }) {
  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</p>
      <p className="mt-1">{a.name}</p>
      <p className="text-sm text-muted-foreground">
        {a.line1}
        <br />
        {a.postcode} {a.city}, {countryName(a.countryCode)}
      </p>
    </div>
  );
}

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quote = await getMyQuote(id);
  if (!quote) notFound();

  const expired = quote.status === "EXPIRED" || (quote.status === "PRICED" && quote.expiresAt && quote.expiresAt <= new Date());
  const packages = (quote.packages as PackageInput[]) ?? [];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">{SERVICE_LABEL[quote.serviceType]} quote</h1>
        <QuoteStatusBadge status={expired ? "EXPIRED" : quote.status} />
      </div>

      <Card>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <AddressBlock title="From" a={asAddress(quote.origin)} />
          <AddressBlock title="To" a={asAddress(quote.destination)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {quote.distanceKm != null && <p>Distance: {quote.distanceKm} km</p>}
          {packages.map((p, i) => (
            <p key={i}>
              {p.qty} × {p.weightKg} kg, {p.lengthCm}×{p.widthCm}×{p.heightCm} cm
            </p>
          ))}
          {quote.adminNote && <p className="pt-2">Note from our team: {quote.adminNote}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Price</p>
            <p className="text-3xl font-semibold">
              {quote.priceCents != null ? formatMoney(quote.priceCents) : "Awaiting our team"}
            </p>
            {quote.expiresAt && quote.status === "PRICED" && !expired && (
              <p className="text-sm text-muted-foreground">Valid until {dateFmt.format(quote.expiresAt)}</p>
            )}
          </div>
          {quote.status === "PRICED" && !expired && (
            <AcceptQuoteButton quoteId={quote.id} byCard={quote.serviceType !== "FREIGHT"} />
          )}
          {quote.status === "ACCEPTED" && quote.shipment && (
            <Link href={`/shipments/${quote.shipment.id}`} className={buttonVariants({ variant: "outline" })}>
              View shipment
            </Link>
          )}
          {expired && (
            <Link href="/quote" className={buttonVariants({ variant: "outline" })}>
              Get a new quote
            </Link>
          )}
        </CardContent>
      </Card>
      {quote.status === "PENDING_REVIEW" && (
        <p className="text-sm text-muted-foreground">We&apos;ll email you as soon as this quote is priced.</p>
      )}
    </main>
  );
}
