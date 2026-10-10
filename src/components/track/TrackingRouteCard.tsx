import { shortPlace } from "@/lib/address";
import { countryName } from "@/lib/geo/countries";
import type { ServiceType, TransportMode } from "@prisma/client";
import { ArrowRight, Plane, Ship, Truck, MapPin } from "lucide-react";

export function TrackingRouteCard({
  origin,
  destination,
  transportMode,
  departurePort,
  arrivalPort,
}: {
  origin: { city: string; countryCode: string };
  destination: { city: string; countryCode: string };
  serviceType: ServiceType;
  transportMode: TransportMode | null;
  departurePort: string | null;
  arrivalPort: string | null;
}) {
  const ModeIcon = transportMode === "SEA" ? Ship : transportMode === "ROAD" ? Truck : Plane;

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6" data-testid="tracking-route-card">
      <div className="mb-4 flex items-center justify-between text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        <span>Consignment Transit Route</span>
        <span className="font-mono text-[11px] text-primary">Carrier Network Verified</span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        {/* Origin */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase">
            <MapPin className="size-3.5 text-primary" />
            <span>Origin Facility</span>
          </div>
          <p className="text-base font-bold text-foreground sm:text-lg">{shortPlace(origin)}</p>
          <p className="text-xs text-muted-foreground">{countryName(origin.countryCode)}</p>
          {departurePort && (
            <span className="inline-block mt-1 rounded bg-muted px-2 py-0.5 font-mono text-[11px] font-semibold text-foreground">
              Port: {departurePort}
            </span>
          )}
        </div>

        {/* Center Route Flight / Vessel Indicator */}
        <div className="flex flex-col items-center justify-center px-2">
          <div className="flex size-9 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
            <ModeIcon className="size-4.5" />
          </div>
          <div className="mt-1 flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
            <span>Direct</span>
            <ArrowRight className="size-3" />
          </div>
        </div>

        {/* Destination */}
        <div className="space-y-1 text-right">
          <div className="flex items-center justify-end gap-1.5 text-xs font-semibold text-muted-foreground uppercase">
            <span>Destination Hub</span>
            <MapPin className="size-3.5 text-emerald-600" />
          </div>
          <p className="text-base font-bold text-foreground sm:text-lg">{shortPlace(destination)}</p>
          <p className="text-xs text-muted-foreground">{countryName(destination.countryCode)}</p>
          {arrivalPort && (
            <span className="inline-block mt-1 rounded bg-muted px-2 py-0.5 font-mono text-[11px] font-semibold text-foreground">
              Port: {arrivalPort}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
