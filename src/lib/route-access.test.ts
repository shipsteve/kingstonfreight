import { describe, expect, it } from "vitest";
import { routeAccess } from "./route-access";

describe("routeAccess", () => {
  it("lets anyone see public pages", () => {
    expect(routeAccess("/", null)).toEqual({ allow: true });
    expect(routeAccess("/track/SHP-ABCD234567", null)).toEqual({ allow: true });
  });

  it("sends logged-out users to login with next", () => {
    expect(routeAccess("/dashboard", null)).toEqual({ allow: false, redirect: "/login?next=%2Fdashboard" });
    expect(routeAccess("/quotes/abc", null)).toEqual({ allow: false, redirect: "/login?next=%2Fquotes%2Fabc" });
    expect(routeAccess("/admin/pricing", null)).toEqual({ allow: false, redirect: "/login?next=%2Fadmin%2Fpricing" });
  });

  it("requires login for the wallet", () => {
    expect(routeAccess("/account/wallet", null)).toEqual({ allow: false, redirect: "/login?next=%2Faccount%2Fwallet" });
    expect(routeAccess("/account/wallet", "CUSTOMER")).toEqual({ allow: true });
  });

  it("keeps customers out of admin", () => {
    expect(routeAccess("/admin", "CUSTOMER")).toEqual({ allow: false, redirect: "/" });
    expect(routeAccess("/dashboard", "CUSTOMER")).toEqual({ allow: true });
  });

  it("lets admins in", () => {
    expect(routeAccess("/admin/shipments", "ADMIN")).toEqual({ allow: true });
  });

  it("does not treat lookalike paths as admin", () => {
    expect(routeAccess("/administrator", null)).toEqual({ allow: true });
  });
});
