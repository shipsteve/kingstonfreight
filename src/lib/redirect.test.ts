import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./redirect";

describe("safeRedirectPath", () => {
  it("keeps same-site paths", () => {
    expect(safeRedirectPath("/quote")).toBe("/quote");
    expect(safeRedirectPath("/quotes/abc?x=1")).toBe("/quotes/abc?x=1");
  });

  it("falls back for missing or relative values", () => {
    expect(safeRedirectPath(undefined)).toBe("/dashboard");
    expect(safeRedirectPath("")).toBe("/dashboard");
    expect(safeRedirectPath("quote")).toBe("/dashboard");
  });

  it("rejects protocol-relative and absolute URLs", () => {
    expect(safeRedirectPath("//evil.com")).toBe("/dashboard");
    expect(safeRedirectPath("https://evil.com")).toBe("/dashboard");
  });

  it("rejects backslash tricks browsers treat as //", () => {
    expect(safeRedirectPath("/\\evil.com")).toBe("/dashboard");
    expect(safeRedirectPath("/\\/evil.com")).toBe("/dashboard");
  });

  it("rejects control characters", () => {
    expect(safeRedirectPath("/\t/evil.com")).toBe("/dashboard");
    expect(safeRedirectPath("/\n/evil.com")).toBe("/dashboard");
  });
});
