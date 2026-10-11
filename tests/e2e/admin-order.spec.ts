import { expect, test } from "@playwright/test";
import { ADMIN, fillAddress, login, NYC, PARIS, uniqueEmail } from "./helpers";

test("admin creates a counter order with dates, prints the receipt, and the QR target shows the schedule", async ({
  page,
}, testInfo) => {
  await login(page, ADMIN.email, ADMIN.password, "/admin/shipments/new");

  await page.fill("#customerEmail", uniqueEmail("walkin"));
  await fillAddress(page, "sender", NYC);
  await fillAddress(page, "recipient", PARIS);
  await page.selectOption("#serviceType", "FREIGHT");
  await page.fill("#departurePort", "JFK");
  await page.fill("#arrivalPort", "CDG");
  await page.fill("#departureDate", "2026-10-21");
  await page.fill("#estimatedArrival", "2026-10-23");
  await page.fill("#estimatedDelivery", "2026-10-24");
  await page.fill("#pkg-0-weightKg", "12");
  await page.fill("#pkg-0-lengthCm", "60");
  await page.fill("#pkg-0-widthCm", "40");
  await page.fill("#pkg-0-heightCm", "40");
  await page.fill("#pkg-0-qty", "1");
  await page.getByRole("button", { name: "Add package" }).click();
  await page.fill("#pkg-1-weightKg", "3");
  await page.fill("#pkg-1-qty", "1");
  await expect(page.getByTestId("weights")).toContainText("Actual weight 15 kg");
  await page.fill("#contents", "Auto parts");
  await page.fill("#declaredValue", "1500");
  await page.fill("#price", "245");
  await page.getByRole("button", { name: "Create order" }).click();

  await expect(page).toHaveURL(/\/admin\/shipments\/(?!new)[^/]+$/);
  const adminUrl = page.url();
  await page.getByRole("link", { name: "Print receipt" }).click();
  await expect(page).toHaveURL(/\/receipt$/);

  const tracking = (await page.getByTestId("receipt-tracking").textContent())!.trim();
  expect(tracking).toMatch(/^876-[0-9]{8}$/);
  await expect(page.locator('[data-testid="receipt-qr"] svg')).toHaveCount(1);
  await expect(page.getByTestId("receipt-chargeable")).toContainText("kg");
  await expect(page.getByText("JFK → CDG")).toBeVisible();
  const url = (await page.getByText(/Official Public Tracking Portal:/).textContent())!.replace("Official Public Tracking Portal:", "").trim();
  expect(url).toBe(`http://localhost:3200/track/${tracking}`);

  // Verify the physical ticket layout, including its actual PDF paper dimensions.
  await page.emulateMedia({ media: "print" });
  const ticket = page.getByRole("article", { name: "Shipping ticket" });
  const dimensions = await ticket.evaluate((element) => ({
    width: element.getBoundingClientRect().width,
    overflow: element.scrollWidth > element.clientWidth,
  }));
  expect(dimensions.width).toBeCloseTo(80 * 96 / 25.4, 0);
  expect(dimensions.overflow).toBe(false);
  await expect(page.getByRole("navigation", { name: "Admin", exact: true })).toBeHidden();
  await expect(page.getByRole("button", { name: "Print receipt" })).toBeHidden();
  const pdf = await page.pdf({ path: testInfo.outputPath("shipping-ticket.pdf"), preferCSSPageSize: true, displayHeaderFooter: false });
  const pdfText = pdf.toString("latin1");
  expect(pdfText.match(/\/Type \/Page\b/g)).toHaveLength(1);
  const paperWidth = Number(pdfText.match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)/)?.[1]);
  expect(paperWidth).toBeCloseTo(80 * 72 / 25.4, 0);
  await ticket.screenshot({ path: testInfo.outputPath("shipping-ticket.png") });
  await page.emulateMedia({ media: "screen" });

  await page.goto(url);
  await expect(page.getByRole("heading", { level: 1, name: "Booked" })).toBeVisible();
  await expect(page.getByText("Oct 23, 2026")).toBeVisible();
  await expect(page.getByText("Oct 24, 2026", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Shipment route map showing sender, confirmed checkpoints and delivery" })).toBeVisible();

  // Update the existing order; its original tracking link must continue to work.
  await page.goto(adminUrl);
  await page.fill("#sched-delivery", "2026-10-25");
  await page.fill("#sched-next-stop", "New York cargo hub");
  await page.getByRole("button", { name: "Save schedule" }).click();
  await expect(page.getByText("Schedule saved", { exact: true })).toBeVisible();
  await page.selectOption("#status", "IN_TRANSIT");
  await page.fill("#location", "JFK cargo hub");
  await page.selectOption("#countryCode", "US");
  await page.fill("#lat", "40.6413");
  await page.fill("#lng", "-73.7781");
  await page.fill("#note", "Cargo loaded and confirmed by dispatch");
  await page.getByRole("button", { name: "Confirm & publish update" }).click();
  await expect(page.getByText("Update posted and customer emailed", { exact: true })).toBeVisible();
  await page.goto(url);
  await expect(page.getByRole("heading", { level: 1, name: "In transit" })).toBeVisible();
  await expect(page.getByText("Oct 25, 2026", { exact: true })).toBeVisible();
  await expect(page.getByText("Admin-confirmed update", { exact: true })).toBeVisible();
  await expect(page.getByTestId("tracking-stop-points")).toContainText("New York cargo hub");
  await expect(page.getByTestId("tracking-stop-points")).toContainText("Planned · arrival not confirmed");
  await expect(page.getByText("Cargo loaded and confirmed by dispatch", { exact: true }).first()).toBeVisible();
  await expect(page.locator(".leaflet-tooltip")).toContainText("Confirmed location: JFK cargo hub");
});
