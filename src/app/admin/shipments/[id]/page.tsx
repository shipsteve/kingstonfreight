import { notFound } from "next/navigation";
import { PaymentToggle, StatusUpdateForm } from "@/components/admin/ShipmentControls";
import { StatusBadge } from "@/components/shipment/StatusBadge";
import { StatusTimeline } from "@/components/shipment/StatusTimeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { asAddress } from "@/lib/address";
import { countryName } from "@/lib/geo/countries";
import { formatMoney } from "@/lib/money";
import type { Address } from "@/lib/pricing/types";
import { ADMIN_SETTABLE_STATUSES, canTransition } from "@/lib/tracking/status";
import { getShipmentForAdmin } from "@/server/queries/admin";

export const metadata = { title: "Shipment" };

function FullAddress({ title, a }: { title: string; a: Address }) {
  return (
    <div className="text-sm">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</p>
      <p className="mt-1 font-medium">{a.name}</p>
      <p>{a.line1}</p>
      {a.line2 && <p>{a.line2}</p>}
      <p>
        {a.postcode} {a.city}, {countryName(a.countryCode)}
      </p>
      {a.phone && <p>{a.phone}</p>}
    </div>
  );
}

export default async function AdminShipmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getShipmentForAdmin(id);
  if (!s) notFound();

  const nextStatuses = ADMIN_SETTABLE_STATUSES.filter((to) => canTransition(s.status, to));

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-mono text-2xl font-semibold">{s.trackingNumber}</h1>
          <p className="text-sm text-muted-foreground">
            {s.user ? `${s.user.name} · ${s.user.email}` : (s.customerEmail ?? "No customer linked")} · {s.serviceType}
          </p>
        </div>
        <StatusBadge status={s.status} className="text-sm" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Addresses</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FullAddress title="From" a={asAddress(s.origin)} />
            <FullAddress title="To" a={asAddress(s.destination)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-2xl font-semibold tabular-nums">{formatMoney(s.priceCents)}</p>
            <p className="text-sm text-muted-foreground">{s.paymentMethod === "BALANCE" ? "Account balance" : "Paid at counter"}</p>
            <PaymentToggle shipmentId={s.id} paymentStatus={s.paymentStatus} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Post a tracking update</CardTitle>
        </CardHeader>
        <CardContent>
          {nextStatuses.length === 0 ? (
            <p className="text-sm text-muted-foreground">This shipment is closed.</p>
          ) : (
            <StatusUpdateForm shipmentId={s.id} options={nextStatuses} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">History</CardTitle>
        </CardHeader>
        <CardContent>
          <StatusTimeline events={s.events} />
        </CardContent>
      </Card>
    </div>
  );
}
