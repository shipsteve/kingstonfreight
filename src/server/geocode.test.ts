import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { geocodeCity, resetGeocodeCache } from "./geocode";

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

describe("geocodeCity", () => {
  beforeEach(() => {
    resetGeocodeCache();
    vi.stubEnv("GEOCODE_PROVIDER", "nominatim");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns the first Nominatim match as numbers", async () => {
    const fetch = vi.fn(async () => ok([{ lat: "48.8589", lon: "2.32" }]));
    vi.stubGlobal("fetch", fetch);
    expect(await geocodeCity({ city: "Paris", countryCode: "FR" })).toEqual({ lat: 48.8589, lng: 2.32 });
  });

  it("sends only city and country, with an identifying User-Agent", async () => {
    const fetch = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => ok([{ lat: "1", lon: "2" }]));
    vi.stubGlobal("fetch", fetch);
    await geocodeCity({ city: "New York", countryCode: "us" });
    const [url, init] = fetch.mock.calls[0];
    const params = new URL(url).searchParams;
    expect(params.get("city")).toBe("New York");
    expect(params.get("countrycodes")).toBe("us");
    expect([...params.keys()].sort()).toEqual(["city", "countrycodes", "format", "limit"]);
    expect(new Headers(init?.headers).get("user-agent")).toMatch(/\S+/);
  });

  it("caches repeat lookups", async () => {
    const fetch = vi.fn(async () => ok([{ lat: "1", lon: "2" }]));
    vi.stubGlobal("fetch", fetch);
    await geocodeCity({ city: "Paris", countryCode: "FR" });
    await geocodeCity({ city: " paris ", countryCode: "fr" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("returns null when nothing matches, on HTTP errors, and on network failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ok([])));
    expect(await geocodeCity({ city: "Nowhere", countryCode: "US" })).toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("busy", { status: 429 })));
    expect(await geocodeCity({ city: "Busy", countryCode: "US" })).toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("offline"))));
    expect(await geocodeCity({ city: "Offline", countryCode: "US" })).toBeNull();
  });

  it("rejects out-of-range coordinates", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ok([{ lat: "999", lon: "2" }])));
    expect(await geocodeCity({ city: "Weird", countryCode: "US" })).toBeNull();
  });

  it("does nothing when switched off", async () => {
    vi.stubEnv("GEOCODE_PROVIDER", "off");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(await geocodeCity({ city: "Paris", countryCode: "FR" })).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
});
