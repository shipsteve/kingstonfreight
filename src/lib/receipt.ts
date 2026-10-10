/** Absolute URL on this site, from APP_URL (no double slashes). */
export function absoluteUrl(path: string): string {
  const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Public tracking URL encoded in receipt QR codes. */
export function trackingUrl(trackingNumber: string): string {
  return absoluteUrl(`/track/${trackingNumber}`);
}
