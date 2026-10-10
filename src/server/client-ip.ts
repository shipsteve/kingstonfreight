import { headers } from "next/headers";

type Env = Record<string, string | undefined>;

/**
 * Client IP for rate limiting, trusting forwarding headers only where they can't be forged:
 * - On Vercel the platform sets them.
 * - With TRUST_PROXY=1 (self-hosted behind one reverse proxy) the rightmost x-forwarded-for hop is the one
 *   our proxy appended; anything left of it came from the client.
 * - Otherwise headers are ignored and all direct traffic shares one bucket.
 */
export function clientIpFrom(h: Headers, env: Env = process.env): string {
  if (env.VERCEL) {
    return (
      h.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown"
    );
  }
  if (env.TRUST_PROXY === "1") {
    const hops = h.get("x-forwarded-for")?.split(",").map((s) => s.trim()).filter(Boolean);
    return hops?.at(-1) || "unknown";
  }
  return "direct";
}

/** Current request's client IP; "unknown" outside a request (scripts, tests). */
export async function clientIp(): Promise<string> {
  try {
    return clientIpFrom(await headers());
  } catch {
    return "unknown";
  }
}
