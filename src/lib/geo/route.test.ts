import { describe, expect, it } from "vitest";
import { countryCentroid } from "./centroids";
import { markerPosition, routeEndpoints } from "./route";

const nyc = { lat: 40.71, lng: -74.0 };
const paris = { lat: 48.86, lng: 2.35 };
const base = {
  origin: { city: "New York", countryCode: "US", ...nyc },
  destination: { city: "Paris", countryCode: "FR", ...paris },
};

describe("routeEndpoints", () => {
  it("uses city coordinates when known", () => {
    expect(routeEndpoints(base)).toEqual({ from: nyc, to: paris });
  });

  it("falls back to country centroids", () => {
    const t = { origin: { city: "X", countryCode: "US" }, destination: { city: "Y", countryCode: "FR" } };
    expect(routeEndpoints(t)).toEqual({ from: countryCentroid("US"), to: countryCentroid("FR") });
  });

  it("returns null when a country is unknown", () => {
    expect(routeEndpoints({ origin: { city: "X", countryCode: "ZZ" }, destination: base.destination })).toBeNull();
  });
});

describe("markerPosition", () => {
  it("sits on the destination city once delivered", () => {
    expect(markerPosition({ ...base, status: "DELIVERED", events: [] })).toEqual(paris);
  });

  it("uses the city when the latest scan is in the origin or destination country", () => {
    expect(markerPosition({ ...base, status: "IN_TRANSIT", events: [{ countryCode: "US" }] })).toEqual(nyc);
    expect(markerPosition({ ...base, status: "IN_TRANSIT", events: [{ countryCode: "US" }, { countryCode: "FR" }] })).toEqual(
      paris,
    );
  });

  it("uses the country centroid for a transit country", () => {
    expect(markerPosition({ ...base, status: "IN_TRANSIT", events: [{ countryCode: "GB" }] })).toEqual(countryCentroid("GB"));
  });

  it("starts at the origin when no scan has a country", () => {
    expect(markerPosition({ ...base, status: "BOOKED", events: [{ countryCode: null }] })).toEqual(nyc);
  });
});
