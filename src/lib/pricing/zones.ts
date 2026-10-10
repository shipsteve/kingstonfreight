import type { ZoneDef } from "./types";

export function normalizePostcode(p: string): string {
  return p.replace(/\s+/g, "").toUpperCase();
}

export function resolveZone(
  addr: { countryCode: string; postcode: string },
  zones: ZoneDef[],
  homeCountry: string,
): ZoneDef | null {
  const country = addr.countryCode.trim().toUpperCase();

  if (country === homeCountry.toUpperCase()) {
    const postcode = normalizePostcode(addr.postcode);
    let best: { zone: ZoneDef; length: number } | null = null;
    for (const zone of zones) {
      if (zone.kind !== "DOMESTIC") continue;
      for (const prefix of zone.postcodePrefixes) {
        const p = normalizePostcode(prefix);
        if (postcode.startsWith(p) && (!best || p.length > best.length)) best = { zone, length: p.length };
      }
    }
    return best?.zone ?? null;
  }

  const international = zones.filter((z) => z.kind === "INTERNATIONAL");
  return (
    international.find((z) => z.countryCodes.some((c) => c.toUpperCase() === country)) ??
    international.find((z) => z.countryCodes.length === 0) ??
    null
  );
}
