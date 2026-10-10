import type { LatLng } from "@/lib/geo/centroids";
import { site } from "@/lib/site";

const cache = new Map<string, LatLng | null>();

/** Test helper. */
export function resetGeocodeCache() {
  cache.clear();
}

function enabled() {
  const p = process.env.GEOCODE_PROVIDER;
  if (p) return p === "nominatim";
  return process.env.NODE_ENV !== "test";
}

/**
 * City → coordinates via OpenStreetMap Nominatim (free; ~1 req/s policy, which booking volume stays far below).
 * Sends only city + country. Returns null on any failure so callers can fall back to country centroids.
 */
export async function geocodeCity(place: { city: string; countryCode: string }): Promise<LatLng | null> {
  if (!enabled()) return null;
  const city = place.city.trim();
  const country = place.countryCode.trim().toLowerCase();
  const key = `${city.toLowerCase()}|${country}`;
  if (cache.has(key)) return cache.get(key)!;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("city", city);
  url.searchParams.set("countrycodes", country);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");

  let result: LatLng | null = null;
  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": `${site.name} shipping (${process.env.APP_URL ?? "localhost"})` },
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      const [hit] = (await res.json()) as { lat: string; lon: string }[];
      const lat = Number(hit?.lat);
      const lng = Number(hit?.lon);
      if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        result = { lat, lng };
      }
    }
  } catch {
    result = null;
  }
  cache.set(key, result);
  return result;
}
