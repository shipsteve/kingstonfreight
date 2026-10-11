import { Printer } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ScheduleForm } from "@/components/admin/ScheduleForm";
import { buttonVariants } from "@/components/ui/button";
import { formatShipDate, toDateInput } from "@/lib/dates";
import type { PackageInput } from "@/lib/pricing/types";
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
      {a.email && <p>{a.email}</p>}
    </div>
  );
}

export default async function AdminShipmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getShipmentForAdmin(id);
  if (!s) notFound();

  const nextStatuses = [s.status, ...ADMIN_SETTABLE_STATUSES.filter((to) => canTransition(s.status, to))];

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-mono text-2xl font-semibold">{s.trackingNumber}</h1>
          <p className="text-sm text-muted-foreground">
            {s.user ? `${s.user.name} · ${s.user.email}` : (s.customerEmail ?? "No customer linked")} · {s.serviceType}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={s.status} className="text-sm" />
          <Link
            href={`/admin/shipments/${s.id}/receipt`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Printer /> Print receipt
          </Link>
        </div>
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
            <p className="text-sm text-muted-foreground">
              {s.paymentMethod === "BALANCE" ? "Account balance" : "Paid at counter"}
            </p>
            {s.paymentMethod === "COUNTER" ? (
              <PaymentToggle shipmentId={s.id} paymentStatus={s.paymentStatus} />
            ) : (
              <p className="text-sm">{s.paymentStatus === "REFUNDED" ? "Refunded to balance" : "Paid from balance"}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <div className="space-y-1">
            {s.transportMode && (
              <p>
                Mode: {s.transportMode}
                {(s.departurePort || s.arrivalPort) && ` · ${s.departurePort ?? "—"} → ${s.arrivalPort ?? "—"}`}
              </p>
            )}
            {s.departureDate && <p>Departs {formatShipDate(s.departureDate)}</p>}
            {s.estimatedArrival && <p>Estimated arrival {formatShipDate(s.estimatedArrival)}</p>}
            {s.contents && <p>Contents: {s.contents}</p>}
            {s.declaredValueCents != null && <p>Declared value: {formatMoney(s.declaredValueCents)}</p>}
            {s.goodsOriginCountry && <p>Country of origin: {countryName(s.goodsOriginCountry)}</p>}
            {s.hsCode && <p>HS code: {s.hsCode}</p>}
            {s.billTo && <p>Bill to: {s.billTo.replace("_", " ").toLowerCase()}</p>}
          </div>
          <div className="space-y-1">
            {((s.packages as PackageInput[] | null) ?? []).map((p, i) => (
              <p key={i}>
                {p.qty} × {p.weightKg} kg, {p.lengthCm}×{p.widthCm}×{p.heightCm} cm
              </p>
            ))}
            {s.actualWeightKg != null && (
              <p className="pt-1 text-muted-foreground">
                Actual {s.actualWeightKg} kg · Chargeable {s.chargeableWeightKg} kg
              </p>
            )}
          </div>
          <div className="border-t pt-4 sm:col-span-2">
            <ScheduleForm
              shipmentId={s.id}
              departureDate={toDateInput(s.departureDate)}
              estimatedArrival={toDateInput(s.estimatedArrival)}
              estimatedDelivery={toDateInput(s.estimatedDelivery)}
              nextStop={s.nextStop}
            />
          </div>
        </CardContent>
      </Card>

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
