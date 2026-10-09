import { FreightQuoteActions } from "@/components/admin/FreightQuoteActions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { asAddress } from "@/lib/address";
import { countryName } from "@/lib/geo/countries";
import type { PackageInput } from "@/lib/pricing/types";
import { listPendingFreightQuotes } from "@/server/queries/admin";

export const metadata = { title: "Freight quotes" };

const dateFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

export default async function AdminQuotesPage() {
  const quotes = await listPendingFreightQuotes();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Freight quotes</h1>
        <p className="text-muted-foreground">Oldest first. Pricing a quote emails the customer.</p>
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
                <CardTitle className="text-base">
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
                  {packages.map((p, i) => (
                    <p key={i}>
                      {p.qty} × {p.weightKg} kg, {p.lengthCm}×{p.widthCm}×{p.heightCm} cm
                    </p>
                  ))}
                </div>
                <FreightQuoteActions quoteId={q.id} />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
