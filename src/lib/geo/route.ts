import { countryCentroid, type LatLng } from "./centroids";

type Place = { city: string; countryCode: string; lat?: number | null; lng?: number | null };

const point = (p: Place): LatLng | null =>
  p.lat != null && p.lng != null ? { lat: p.lat, lng: p.lng } : countryCentroid(p.countryCode);

/** Route ends: geocoded city when we have it, else the country's centroid. */
export function routeEndpoints(t: { origin: Place; destination: Place }): { from: LatLng; to: LatLng } | null {
  const from = point(t.origin);
  const to = point(t.destination);
  return from && to ? { from, to } : null;
}

/** Where to pin the shipment: delivered → destination; else the latest scanned country (city-accurate at either end). */
export function markerPosition(t: {
  origin: Place;
  destination: Place;
  status: string;
  events: { countryCode: string | null; lat?: number | null; lng?: number | null }[];
}): LatLng | null {
  const latest = t.events.at(-1);
  if (latest?.lat != null && latest.lng != null) return { lat: latest.lat, lng: latest.lng };
  if (t.status === "DELIVERED") return point(t.destination);
  const country = [...t.events].reverse().find((e) => e.countryCode)?.countryCode?.toUpperCase();
  if (!country) return point(t.origin);
  if (country === t.destination.countryCode.toUpperCase()) return point(t.destination);
  if (country === t.origin.countryCode.toUpperCase()) return point(t.origin);
  return countryCentroid(country);
}
