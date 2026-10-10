import { describe, expect, it } from "vitest";
import { clientIpFrom } from "./client-ip";

const h = (init: Record<string, string>) => new Headers(init);

describe("clientIpFrom", () => {
  it("on Vercel trusts the platform header", () => {
    expect(clientIpFrom(h({ "x-vercel-forwarded-for": "1.1.1.1", "x-forwarded-for": "6.6.6.6" }), { VERCEL: "1" })).toBe(
      "1.1.1.1",
    );
  });

  it("on Vercel falls back to the first x-forwarded-for entry (Vercel overwrites it)", () => {
    expect(clientIpFrom(h({ "x-forwarded-for": "2.2.2.2, 10.0.0.1" }), { VERCEL: "1" })).toBe("2.2.2.2");
  });

  it("behind a trusted proxy uses the hop the proxy appended (rightmost), not the client-supplied left side", () => {
    expect(clientIpFrom(h({ "x-forwarded-for": "6.6.6.6, 3.3.3.3" }), { TRUST_PROXY: "1" })).toBe("3.3.3.3");
  });

  it("ignores forwarding headers when no proxy is trusted, so they can't be spoofed", () => {
    expect(clientIpFrom(h({ "x-forwarded-for": "6.6.6.6", "x-real-ip": "7.7.7.7" }), {})).toBe("direct");
  });

  it("returns 'unknown' when a trusted header is missing", () => {
    expect(clientIpFrom(h({}), { TRUST_PROXY: "1" })).toBe("unknown");
    expect(clientIpFrom(h({}), { VERCEL: "1" })).toBe("unknown");
  });
});
