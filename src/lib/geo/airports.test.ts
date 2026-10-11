import { describe, expect, it } from "vitest";
import { plannedAirportStops } from "./airports";

const route = { transportMode: "AIR", departurePort: "KIN", arrivalPort: "JFK" };
describe("planned airport stops", () => {
  it("lists the recorded departure and arrival airports in order", () => {
    expect(plannedAirportStops({ ...route, nextStop: "Norman Manley International Airport (KIN)" }).map(s => s.code)).toEqual(["KIN", "JFK"]);
  });
  it("removes earlier planned airports when the next stop advances", () => {
    expect(plannedAirportStops({ ...route, nextStop: "John F. Kennedy International Airport (JFK)" }).map(s => s.code)).toEqual(["JFK"]);
  });
  it("supports the corrected Kingston-to-Savannah airport route", () => {
    expect(plannedAirportStops({ ...route, arrivalPort: "SAV", nextStop: "Norman Manley International Airport (KIN)" }).map(s => s.code)).toEqual(["KIN", "SAV"]);
  });
  it("does not invent stops for unsupported ports or a sea route", () => {
    expect(plannedAirportStops({ ...route, transportMode: "SEA" })).toEqual([]);
    expect(plannedAirportStops({ transportMode: "AIR", departurePort: "XXX", arrivalPort: "YYY" })).toEqual([]);
  });
});
