// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TrackingReroutingNotice } from "./TrackingReroutingNotice";

describe("TrackingReroutingNotice", () => {
  it("renders rerouting notice with the fee and payment condition", () => {
    render(
      <TrackingReroutingNotice
        trackingNumber="876-21252674"
        reroutingFeeCents={26800}
        reroutingAddress="420 E Boundary, Augusta, GA 30901, Apt 0315"
      />,
    );

    expect(screen.getByText(/Consignment Paused · Address Rerouting in Progress/i)).toBeInTheDocument();
    expect(screen.getByText(/Waybill: 876-21252674/i)).toBeInTheDocument();
    expect(screen.getByText(/Status: Rerouting/i)).toBeInTheDocument();

    // Check wrong address / pause details
    expect(screen.getByText(/Delivery Paused for Address Correction/i)).toBeInTheDocument();
    expect(screen.getByText(/incorrect destination address/i)).toBeInTheDocument();
    expect(screen.getByText(/420 E Boundary, Augusta, GA 30901, Apt 0315/i)).toBeInTheDocument();

    // Check additional cost details
    expect(screen.getByText(/Additional Rerouting Cost Notice/i)).toBeInTheDocument();
    expect(screen.getByText(/additional rerouting charge:/i).parentElement).toHaveTextContent("$268.00");
    expect(screen.getByText(/payment is required before dispatch/i)).toBeInTheDocument();

    // Check mailto link
    const mailLink = screen.getByRole("link", { name: /Contact Dispatch Support via Email/i });
    expect(mailLink).toBeInTheDocument();
    expect(mailLink).toHaveAttribute("href", expect.stringContaining("mailto:admin@kingstonfreight.com"));
    expect(mailLink).toHaveAttribute("href", expect.stringContaining("Address%20Correction"));
  });
});
