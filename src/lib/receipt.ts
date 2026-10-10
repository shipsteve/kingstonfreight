/** Public tracking URL encoded in receipt QR codes. */
export function trackingUrl(trackingNumber: string): string {
  const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
  return `${base}/track/${trackingNumber}`;
}
