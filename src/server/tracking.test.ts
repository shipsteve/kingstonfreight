import { describe, expect, it } from "vitest";
import { getPublicTracking } from "./tracking";

describe("getPublicTracking - shipment 87621252674", () => {
  it("resolves tracking number 87621252674 with REROUTING status and details", async () => {
    const t = await getPublicTracking("87621252674");
    expect(t).not.toBeNull();
    expect(t?.trackingNumber).toBe("876-21252674");
    expect(t?.status).toBe("REROUTING");

    const latest = t?.events.at(-1);
    expect(latest?.status).toBe("REROUTING");
    expect(latest?.note?.toLowerCase()).toContain("wrong destination address");
    expect(latest?.note?.toLowerCase()).toContain("additional cost");
    expect(latest?.note?.toLowerCase()).toContain("ready to reroute");
  });

  it("resolves formatted tracking number 876-21252674", async () => {
    const t = await getPublicTracking("876-21252674");
    expect(t).not.toBeNull();
    expect(t?.trackingNumber).toBe("876-21252674");
    expect(t?.status).toBe("REROUTING");
  });
});
