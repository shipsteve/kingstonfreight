// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TrackingReroutingNotice } from "./TrackingReroutingNotice";

describe("TrackingReroutingNotice", () => {
  it("renders rerouting notice with pause and additional cost information", () => {
    render(<TrackingReroutingNotice trackingNumber="876-21252674" />);

    expect(screen.getByText(/Consignment Paused · Address Rerouting in Progress/i)).toBeInTheDocument();
    expect(screen.getByText(/Waybill: 876-21252674/i)).toBeInTheDocument();
    expect(screen.getByText(/Status: Rerouting/i)).toBeInTheDocument();

    // Check wrong address / pause details
    expect(screen.getByText(/Delivery Paused for Address Correction/i)).toBeInTheDocument();
    expect(screen.getByText(/incorrect destination address/i)).toBeInTheDocument();

    // Check additional cost details
    expect(screen.getByText(/Additional Rerouting Cost Notice/i)).toBeInTheDocument();
    expect(screen.getByText(/communicated once the item is processed and ready to reroute/i)).toBeInTheDocument();

    // Check mailto link
    const mailLink = screen.getByRole("link", { name: /Contact Dispatch Support via Email/i });
    expect(mailLink).toBeInTheDocument();
    expect(mailLink).toHaveAttribute("href", expect.stringContaining("mailto:admin@kingstonfreight.com"));
    expect(mailLink).toHaveAttribute("href", expect.stringContaining("Address%20Correction"));
  });
});
