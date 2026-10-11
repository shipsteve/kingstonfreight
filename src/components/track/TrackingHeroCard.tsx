import type { ServiceType, ShipmentStatus, TransportMode } from "@prisma/client";
import { formatShipDate } from "@/lib/dates";
import { STATUS_LABELS } from "@/lib/tracking/labels";
import { CalendarCheck, Clock, Plane, Ship, Truck, ShieldCheck, CheckCircle2 } from "lucide-react";
import { StatusBadge } from "@/components/shipment/StatusBadge";

const SERVICE_LABEL: Record<ServiceType, string> = {
  PARCEL: "Express Parcel",
  COURIER: "Direct Courier",
  FREIGHT: "Commercial Freight",
};

const MODE_LABEL: Record<TransportMode, string> = {
  AIR: "Air Freight Linehaul",
  SEA: "Ocean Container",
  ROAD: "Ground Linehaul",
};

export function TrackingHeroCard({
  trackingNumber,
  status,
  serviceType,
  transportMode,
  departurePort,
  arrivalPort,
  departureDate,
  estimatedArrival,
  estimatedDelivery,
  deliveredAt,
  latestLocation,
}: {
  trackingNumber: string;
  status: ShipmentStatus;
  serviceType: ServiceType;
  transportMode: TransportMode | null;
  departurePort: string | null;
  arrivalPort: string | null;
  departureDate: Date | null;
  estimatedArrival: Date | null;
  estimatedDelivery: Date | null;
  deliveredAt: Date | null;
  latestLocation?: string;
}) {
  const isDelivered = status === "DELIVERED";
  const ModeIcon = transportMode === "SEA" ? Ship : transportMode === "ROAD" ? Truck : Plane;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.3fr_1fr] lg:items-center">
        {/* Left: Waybill & Status Headline */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-muted px-2.5 py-1 font-mono text-xs font-semibold text-foreground">
              {trackingNumber}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5 text-emerald-600" />
              Verified Cargo Consignment
            </span>
          </div>

          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              {STATUS_LABELS[status]}
            </h1>
            {latestLocation && (
              <p className="mt-1 text-sm text-muted-foreground">
                Current location: <strong className="font-semibold text-foreground">{latestLocation}</strong>
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <StatusBadge status={status} />
            <span className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 font-medium text-foreground">
              <ModeIcon className="size-3.5 text-muted-foreground" />
              {transportMode ? MODE_LABEL[transportMode] : SERVICE_LABEL[serviceType]}
            </span>
            <span className="rounded-md border border-border bg-background px-2 py-1 text-muted-foreground">
              {SERVICE_LABEL[serviceType]}
            </span>
          </div>
        </div>

        {/* Right: Prominent Delivery Window (EDD) */}
        <div
          className={`relative overflow-hidden rounded-xl border p-5 ${
            isDelivered
              ? "border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20"
              : "border-primary/20 bg-primary/5"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold tracking-wider uppercase">
            <span className={isDelivered ? "text-emerald-700 dark:text-emerald-400" : "text-primary"}>
              {isDelivered ? "Delivered" : "Estimated Delivery"}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                isDelivered
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300"
              }`}
            >
              {isDelivered ? <CheckCircle2 className="size-3" /> : <Clock className="size-3" />}
              {isDelivered ? "Completed" : estimatedDelivery ? "Estimated" : "Awaiting date"}
            </span>
          </div>

          <p className="mt-2 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            {isDelivered ? (deliveredAt ? formatShipDate(deliveredAt) : "Delivery confirmed")
              : estimatedDelivery ? formatShipDate(estimatedDelivery) : "To be confirmed"}
          </p>
          {estimatedArrival && <p className="mt-2 text-xs text-muted-foreground">Estimated hub arrival: {formatShipDate(estimatedArrival)}</p>}
          {departureDate && <p className="mt-1 text-xs text-muted-foreground">Departure: {formatShipDate(departureDate)}</p>}

          <div className="mt-3 border-t border-border/60 pt-2.5 text-xs text-muted-foreground">
            {departurePort && arrivalPort ? (
              <p className="font-mono">
                Port routing: <strong className="text-foreground">{departurePort}</strong> →{" "}
                <strong className="text-foreground">{arrivalPort}</strong>
              </p>
            ) : (
              <p className="flex items-center gap-1">
                <CalendarCheck className="size-3.5 text-primary" />
                Delivery schedule updated by dispatch
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
