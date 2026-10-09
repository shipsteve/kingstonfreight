import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/test/complete-checkout/route";

vi.mock("@/server/shipments", () => ({ completeCheckout: vi.fn(async () => "noop") }));

const call = () =>
  POST(new Request("http://x/api/test/complete-checkout", { method: "POST", body: JSON.stringify({ shipmentId: "s1" }) }));

describe("E2E checkout stand-in route", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("is disabled unless E2E_TEST_MODE=1", async () => {
    vi.stubEnv("E2E_TEST_MODE", "");
    expect((await call()).status).toBe(404);
  });

  it("completes checkout in E2E mode", async () => {
    vi.stubEnv("E2E_TEST_MODE", "1");
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ result: "noop" });
  });
});
