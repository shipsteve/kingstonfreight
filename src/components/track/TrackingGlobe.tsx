"use client";

import { MapPin } from "lucide-react";
import dynamic from "next/dynamic";
import { SceneSlot } from "@/components/3d/SceneSlot";
import { countryName } from "@/lib/geo/countries";
import { markerPosition, routeEndpoints } from "@/lib/geo/route";
import type { PublicTracking } from "@/server/tracking";

const Globe = dynamic(() => import("@/components/3d/Globe"), { ssr: false });

const frame =
  "relative aspect-square w-full overflow-hidden rounded-3xl border bg-[radial-gradient(circle_at_50%_40%,#1b2f63,#0b1430)]";

export function TrackingGlobe({ tracking }: { tracking: PublicTracking }) {
  const route = routeEndpoints(tracking);
  const marker = markerPosition(tracking) ?? undefined;
  const current = [...tracking.events].reverse().find((e) => e.countryCode)?.countryCode;

  const fallback = (
    <div className={`${frame} flex flex-col items-center justify-center gap-3 p-6 text-center text-white`}>
      <MapPin className="size-8 text-brand-amber" />
      <p className="text-lg font-medium">
        {tracking.origin.city} → {tracking.destination.city}
      </p>
      {current && <p className="text-sm text-white/70">Currently in {countryName(current)}</p>}
    </div>
  );

  if (!route) return fallback;

  return (
    <SceneSlot
      fallback={fallback}
      render={(active) => (
        <div className={frame}>
          <Globe routes={[route]} marker={marker} active={active} />
        </div>
      )}
    />
  );
}
