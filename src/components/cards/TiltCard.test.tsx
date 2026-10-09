// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TiltCard } from "./TiltCard";

function mockReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: reduce && query.includes("prefers-reduced-motion"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    })),
  );
}

function box(el: HTMLElement) {
  el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100, x: 0, y: 0, toJSON: () => ({}) });
}

describe("TiltCard", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders its children", () => {
    mockReducedMotion(false);
    render(<TiltCard>Parcel</TiltCard>);
    expect(screen.getByText("Parcel")).toBeTruthy();
  });

  it("tilts toward the pointer", () => {
    mockReducedMotion(false);
    render(<TiltCard data-testid="card">Parcel</TiltCard>);
    const card = screen.getByTestId("card");
    box(card);
    fireEvent.pointerMove(card, { clientX: 200, clientY: 0 });
    expect(card.style.getPropertyValue("--tilt-y")).not.toBe("");
    expect(card.style.getPropertyValue("--tilt-y")).not.toBe("0deg");
  });

  it("does not tilt when the user prefers reduced motion", () => {
    mockReducedMotion(true);
    render(<TiltCard data-testid="card">Parcel</TiltCard>);
    const card = screen.getByTestId("card");
    box(card);
    fireEvent.pointerMove(card, { clientX: 200, clientY: 0 });
    expect(card.style.getPropertyValue("--tilt-y")).toBe("");
    expect(card.style.transform).toBe("");
  });
});
