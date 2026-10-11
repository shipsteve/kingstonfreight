"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { routeEndpoints } from "@/lib/geo/route";
import { STATUS_LABELS } from "@/lib/tracking/labels";
import type { PublicTracking } from "@/server/tracking";
import { TrackingStopPoints } from "./TrackingStopPoints";
import { plannedAirportStops } from "@/lib/geo/airports";

const Map = dynamic(() => import("./TrackingMapCanvas"), {
  ssr: false,
  loading: () => <div className="flex h-[360px] items-center justify-center bg-muted text-sm">Loading route map…</div>,
});

export function TrackingTransitCard({ tracking }: { tracking: PublicTracking }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, 30_000);
    return () => clearInterval(timer);
  }, [router]);
  const latest = tracking.events.at(-1);
  const confirmed = latest?.confirmedAt;
  return <Card className="overflow-hidden">
    <CardHeader>
      <CardTitle>Active route · sender to delivery</CardTitle>
      <p className="text-sm text-muted-foreground">{tracking.origin.city} → {tracking.destination.city}</p>
    </CardHeader>
    {routeEndpoints(tracking) ? <Map tracking={tracking} /> : <p className="px-6 text-sm text-muted-foreground">Route map is awaiting location data.</p>}
    <CardContent className="space-y-4 pt-5">
      <TrackingStopPoints nextStop={tracking.nextStop} status={tracking.status} stopCount={plannedAirportStops(tracking).length || 1} />
      <p className="text-xs text-muted-foreground">Hollow purple map points are airport transit points. Only the next stop is named.</p>
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span>🟢 Confirmed checkpoints</span><span>🟠 Latest location</span><span>🔵 Delivery / remaining route</span>
      </div>
      <p className="text-xs text-muted-foreground">Lines connect recorded checkpoints; they show the shipment route, not GPS movement or road directions. Locations without coordinates are approximate.</p>
      <div className="rounded-xl border bg-muted/40 p-4" aria-live="polite">
        <p className="text-xs font-medium text-muted-foreground">{confirmed ? "Admin-confirmed update" : "Latest recorded update"}</p>
        <p className="mt-1 font-semibold">{STATUS_LABELS[tracking.status]}</p>
        <p className="text-sm">{latest?.location ?? "Awaiting a location update"}</p>
        {latest?.note && <p className="mt-3 whitespace-pre-wrap text-sm">{latest.note}</p>}
        {latest && <p className="mt-3 text-xs text-muted-foreground">Updated <time dateTime={new Date(latest.createdAt).toISOString()}>{new Date(latest.createdAt).toLocaleString("en-US", { timeZone: "UTC" })} UTC</time></p>}
        <p className="mt-2 text-xs text-muted-foreground">Checks for admin updates every 30 seconds.</p>
      </div>
    </CardContent>
  </Card>;
}
