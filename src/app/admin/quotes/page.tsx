import { QuoteActions } from "@/components/admin/QuoteActions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { asAddress } from "@/lib/address";
import { countryName } from "@/lib/geo/countries";
import { formatMoney } from "@/lib/money";
import type { PackageInput } from "@/lib/pricing/types";
import { listQuotesToPrice } from "@/server/queries/admin";

export const metadata = { title: "Quotes to price" };

const SERVICE_LABEL = { PARCEL: "Parcel", COURIER: "Local courier", FREIGHT: "Freight" } as const;
const dateFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

export default async function AdminQuotesPage() {
  const quotes = await listQuotesToPrice();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Quotes to price</h1>
        <p className="text-muted-foreground">Oldest first. Sending a price emails the customer, who pays from their balance.</p>
      </div>
      {quotes.length === 0 && <p className="text-muted-foreground">Nothing waiting. Nice.</p>}
      <div className="grid gap-4">
        {quotes.map((q) => {
          const o = asAddress(q.origin);
          const d = asAddress(q.destination);
          const details = q.freightDetails as { mode: string; cargoType: string; description: string } | null;
          const packages = (q.packages as PackageInput[]) ?? [];
          return (
            <Card key={q.id}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  <Badge variant="secondary">{SERVICE_LABEL[q.serviceType]}</Badge>
                  {o.city}, {countryName(o.countryCode)} → {d.city}, {countryName(d.countryCode)}
                </CardTitle>
                <CardDescription>
                  {q.user?.name} ({q.user?.email}) · {dateFmt.format(q.createdAt)}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 lg:grid-cols-[1fr_minmax(280px,360px)]">
                <div className="space-y-1 text-sm">
                  {details && (
                    <>
                      <p>
                        <span className="font-medium">{details.mode}</span> · {details.cargoType}
                      </p>
                      <p className="whitespace-pre-wrap text-muted-foreground">{details.description}</p>
                    </>
                  )}
                  {q.distanceKm != null && <p>Distance: {q.distanceKm} km</p>}
                  {packages.map((p, i) => (
                    <p key={i}>
                      {p.qty} × {p.weightKg} kg, {p.lengthCm}×{p.widthCm}×{p.heightCm} cm
                    </p>
                  ))}
                  <p className="pt-2 text-muted-foreground">
                    Suggested from rate table:{" "}
                    {q.suggestedCents != null ? (
                      <span className="font-medium text-foreground">{formatMoney(q.suggestedCents)}</span>
                    ) : (
                      "none (price manually)"
                    )}
                  </p>
                </div>
                <QuoteActions quoteId={q.id} suggestedCents={q.suggestedCents} />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
