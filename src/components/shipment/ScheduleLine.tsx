import { CalendarClock, Plane, Ship, Truck } from "lucide-react";
import type { TransportMode } from "@prisma/client";
import { formatShipDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

const MODE_ICON = { AIR: Plane, SEA: Ship, ROAD: Truck } as const;

/** "Departs Oct 21, 2026 · Estimated arrival Oct 23, 2026" — renders nothing when no dates are set. */
export function ScheduleLine({
  departureDate,
  estimatedArrival,
  estimatedDelivery,
  transportMode,
  departurePort,
  arrivalPort,
  className,
}: {
  departureDate: Date | string | null;
  estimatedArrival: Date | string | null;
  estimatedDelivery?: Date | string | null;
  transportMode?: TransportMode | null;
  departurePort?: string | null;
  arrivalPort?: string | null;
  className?: string;
}) {
  if (!departureDate && !estimatedArrival && !estimatedDelivery) return null;
  const Icon = transportMode ? MODE_ICON[transportMode] : CalendarClock;
  const ports = departurePort || arrivalPort ? `${departurePort ?? "—"} → ${arrivalPort ?? "—"}` : null;
  return (
    <p className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 text-sm", className)}>
      <Icon className="size-4 text-primary" aria-hidden />
      {ports && <span className="font-mono">{ports}</span>}
      {departureDate && <span>Departs {formatShipDate(departureDate)}</span>}
      {departureDate && estimatedArrival && <span aria-hidden>·</span>}
      {estimatedArrival && (
        <span>
          Estimated arrival <span className="font-medium">{formatShipDate(estimatedArrival)}</span>
        </span>
      )}
      {estimatedDelivery && <span>Estimated delivery <span className="font-medium">{formatShipDate(estimatedDelivery)}</span></span>}
    </p>
  );
}
