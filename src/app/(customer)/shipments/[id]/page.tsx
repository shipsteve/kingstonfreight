import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/shipment/CopyButton";
import { PayNowButton } from "@/components/shipment/PaymentButtons";
import { StatusBadge } from "@/components/shipment/StatusBadge";
import { StatusTimeline } from "@/components/shipment/StatusTimeline";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { asAddress, shortPlace } from "@/lib/address";
import { formatMoney } from "@/lib/money";
import { getMyShipment } from "@/server/queries/customer";

export const metadata = { title: "Shipment" };

export default async function ShipmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const [{ id }, { paid }] = await Promise.all([params, searchParams]);
  const shipment = await getMyShipment(id);
  if (!shipment) notFound();

  const awaitingPayment = shipment.status === "AWAITING_PAYMENT";

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-12">
      {paid && awaitingPayment && (
        <p role="status" className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-3 text-sm">
          Payment received by Stripe. Confirming your booking… refresh in a moment.
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Tracking number</p>
          <div className="flex items-center gap-2">
            <h1 className="font-mono text-2xl font-semibold">{shipment.trackingNumber}</h1>
            <CopyButton value={shipment.trackingNumber} />
          </div>
        </div>
        <StatusBadge status={shipment.status} className="text-sm" />
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-lg">
              {shortPlace(asAddress(shipment.origin))} → {shortPlace(asAddress(shipment.destination))}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatMoney(shipment.priceCents)} ·{" "}
              {shipment.paymentMethod === "INVOICE" ? "Invoice" : "Card"}{" "}
              <Badge variant="outline" className="ml-1">
                {shipment.paymentStatus === "PAID" ? "Paid" : "Unpaid"}
              </Badge>
            </p>
          </div>
          {awaitingPayment && <PayNowButton shipmentId={shipment.id} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tracking history</CardTitle>
        </CardHeader>
        <CardContent>
          <StatusTimeline events={shipment.events} />
        </CardContent>
      </Card>

      {!awaitingPayment && (
        <p className="text-sm text-muted-foreground">
          Share the public tracking link:{" "}
          <Link className="underline underline-offset-4" href={`/track/${shipment.trackingNumber}`}>
            /track/{shipment.trackingNumber}
          </Link>
        </p>
      )}
    </main>
  );
}
