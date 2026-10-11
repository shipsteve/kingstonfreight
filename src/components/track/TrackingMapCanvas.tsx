"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { routeEndpoints } from "@/lib/geo/route";
import { countryCentroid } from "@/lib/geo/centroids";
import type { PublicTracking } from "@/server/tracking";
import { plannedAirportStops } from "@/lib/geo/airports";

export default function TrackingMapCanvas({ tracking }: { tracking: PublicTracking }) {
  const container = useRef<HTMLDivElement>(null);
  const [tileError, setTileError] = useState(false);
  useEffect(() => {
    if (!container.current) return;
    const route = routeEndpoints(tracking);
    if (!route) return;
    const latest = tracking.events.at(-1);
    const confirmed = latest?.confirmedAt && latest.lat != null && latest.lng != null;
    const current = confirmed ? { lat: latest.lat!, lng: latest.lng! }
      : latest?.countryCode ? countryCentroid(latest.countryCode) : null;
    const map = L.map(container.current, { scrollWheelZoom: false });
    const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
      maxZoom: 19,
    }).addTo(map);
    tiles.on("tileerror", () => setTileError(true));
    // Unwrap longitudes so routes crossing the date line stay on the shorter side of the map.
    const unwrap = (lng: number) => route.from.lng + ((lng - route.from.lng + 540) % 360) - 180;
    const from: L.LatLngTuple = [route.from.lat, route.from.lng];
    const to: L.LatLngTuple = [route.to.lat, unwrap(route.to.lng)];
    const checkpoints: L.LatLngTuple[] = tracking.events
      .filter((e) => e.confirmedAt && e.lat != null && e.lng != null)
      .map((e) => [e.lat!, unwrap(e.lng!)]);
    const travelled = [from, ...checkpoints];
    const plannedStops = tracking.status === "DELIVERED" || tracking.status === "CANCELLED" ? [] : plannedAirportStops(tracking);
    const plannedPoints: L.LatLngTuple[] = plannedStops.map((stop) => [stop.lat, unwrap(stop.lng)]);
    const remaining = [current ? [current.lat, unwrap(current.lng)] as L.LatLngTuple : from, ...plannedPoints, to];
    L.polyline([...travelled, to], { color: "#64748b", weight: 3, dashArray: "7 8" }).addTo(map);
    if (checkpoints.length) L.polyline(travelled, { color: "#059669", weight: 4 }).addTo(map);
    L.polyline(remaining, { color: "#2563eb", weight: 3, dashArray: "7 8" }).addTo(map);
    const pin = (point: L.LatLngTuple, text: string, color: string, radius = 7) => {
      const label = document.createElement("span");
      label.textContent = text;
      return L.circleMarker(point, { radius, color: "#fff", weight: 2, fillColor: color, fillOpacity: 1 })
        .addTo(map).bindTooltip(label);
    };
    pin(from, `Sender: ${tracking.origin.city}${tracking.origin.lat == null ? " (approximate)" : ""}`, "#64748b");
    pin(to, `Delivery: ${tracking.destination.city}${tracking.destination.lat == null ? " (approximate)" : ""}`, "#2563eb");
    const plannedPins = plannedStops.map((stop, index) => {
      const label = document.createElement("span");
      const nextName = tracking.nextStop?.toLowerCase();
      const namedNext = index === 0 && nextName && (nextName.includes(stop.code.toLowerCase()) || nextName.includes(stop.name.toLowerCase()));
      label.textContent = `${namedNext ? `Next transit point: ${tracking.nextStop}` : "Upcoming transit point"} · arrival not confirmed`;
      return L.circleMarker([stop.lat, unwrap(stop.lng)], { radius: 8, color: "#6366f1", weight: 2, dashArray: "3 3", fillOpacity: 0.1 })
        .addTo(map).bindTooltip(label);
    });
    tracking.events.filter((e) => e.confirmedAt && e.lat != null && e.lng != null).forEach((e) => {
      pin([e.lat!, unwrap(e.lng!)], `${e.location}${e.note ? ` — ${e.note}` : ""}`, "#059669", 5);
    });
    const currentPin = current ? pin([current.lat, unwrap(current.lng)], `${confirmed ? "Confirmed" : "Approximate"} location: ${latest?.location}`, "#f59e0b", 10) : null;
    const bounds = L.latLngBounds([...travelled, to, ...remaining]);
    map.fitBounds(bounds, { padding: [35, 35], maxZoom: 11 });
    currentPin?.openTooltip();
    if (!currentPin) plannedPins[0]?.openTooltip();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container.current);
    return () => { observer.disconnect(); map.remove(); };
  }, [tracking]);
  return <div>
    <div ref={container} className="relative z-0 h-[360px] w-full bg-slate-100" role="region" aria-label="Shipment route map showing sender, confirmed checkpoints and delivery" />
    {tileError && <p role="status" className="px-4 py-2 text-xs text-muted-foreground">Map background is unavailable. Route markers and shipment details remain visible.</p>}
  </div>;
}
