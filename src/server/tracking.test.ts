import { describe, expect, it } from "vitest";
import { getPublicTracking } from "./tracking";

describe("getPublicTracking - shipment 87621252674", () => {
  it("resolves tracking number 87621252674 with REROUTING status and details", async () => {
    const t = await getPublicTracking("87621252674");
    expect(t).not.toBeNull();
    expect(t?.trackingNumber).toBe("876-21252674");
    expect(t?.status).toBe("REROUTING");
    expect(t?.destination).toMatchObject({ city: "Augusta", countryCode: "US" });
    expect(t?.departurePort).toBe("KIN");
    expect(t?.arrivalPort).toBe("SAV");
    expect(t?.nextStop).toContain("Augusta, GA");
    expect(t?.nextStop).toContain("payment");
    expect(t?.reroutingFeeCents).toBe(26800);
    expect(t?.reroutingAddress).toBe("420 E Boundary, Augusta, GA 30901, Apt 0315");
    expect(t?.origin).toMatchObject({ city: "Kingston", countryCode: "JM" });
    expect(t?.originAddress).toBe("4th Avenue, Newport West, Kingston, Jamaica");
    expect(t?.events).toHaveLength(1);

    const latest = t?.events.at(-1);
    expect(latest?.status).toBe("REROUTING");
    expect(latest?.location).toBe("Augusta, GA");
    expect(latest?.createdAt).toEqual(new Date("2026-10-21T16:17:46.000Z"));
    expect(latest?.note).toContain("420 E Boundary, Augusta, GA 30901, Apt 0315");
    expect(latest?.note).toContain("$268.00");
    expect(latest?.note?.toLowerCase()).toContain("paid before dispatch");
  });

  it("resolves formatted tracking number 876-21252674", async () => {
    const t = await getPublicTracking("876-21252674");
    expect(t).not.toBeNull();
    expect(t?.trackingNumber).toBe("876-21252674");
    expect(t?.status).toBe("REROUTING");
  });
});
