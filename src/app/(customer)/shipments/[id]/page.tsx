import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/shipment/CopyButton";
import { StatusBadge } from "@/components/shipment/StatusBadge";
import { StatusTimeline } from "@/components/shipment/StatusTimeline";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { asAddress, shortPlace } from "@/lib/address";
import { formatMoney } from "@/lib/money";
import { getMyShipment } from "@/server/queries/customer";

export const metadata = { title: "Shipment" };

export default async function ShipmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const shipment = await getMyShipment(id);
  if (!shipment) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Tracking number</p>
          <div className="flex items-center gap-2">
            <h1 className="font-mono text-2xl font-semibold">{shipment.trackingNumber}</h1>
            <CopyButton value={shipment.trackingNumber} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={shipment.status} className="text-sm" />
          <Link
            href={`/shipments/${shipment.id}/receipt`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Receipt
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-lg">
              {shortPlace(asAddress(shipment.origin))} → {shortPlace(asAddress(shipment.destination))}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatMoney(shipment.priceCents)} ·{" "}
              {shipment.paymentMethod === "BALANCE" ? "Account balance" : "Paid at counter"}{" "}
              <Badge variant="outline" className="ml-1">
                {shipment.paymentStatus === "PAID"
                  ? "Paid"
                  : shipment.paymentStatus === "REFUNDED"
                    ? "Refunded"
                    : "Unpaid"}
              </Badge>
            </p>
          </div>
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

      <p className="text-sm text-muted-foreground">
        Share the public tracking link:{" "}
        <Link className="underline underline-offset-4" href={`/track/${shipment.trackingNumber}`}>
          /track/{shipment.trackingNumber}
        </Link>
      </p>
    </main>
  );
}
