import { expect, test } from "@playwright/test";
import { ADMIN, fillAddress, login, NYC, PARIS, uniqueEmail } from "./helpers";

test("admin creates a counter order with dates, prints the receipt, and the QR target shows the schedule", async ({
  page,
}) => {
  await login(page, ADMIN.email, ADMIN.password, "/admin/shipments/new");

  await page.fill("#customerEmail", uniqueEmail("walkin"));
  await fillAddress(page, "sender", NYC);
  await fillAddress(page, "recipient", PARIS);
  await page.selectOption("#serviceType", "FREIGHT");
  await page.fill("#departurePort", "JFK");
  await page.fill("#arrivalPort", "CDG");
  await page.fill("#departureDate", "2026-10-21");
  await page.fill("#estimatedArrival", "2026-10-23");
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
  await page.getByRole("link", { name: "Print receipt" }).click();
  await expect(page).toHaveURL(/\/receipt$/);

  const tracking = (await page.getByTestId("receipt-tracking").textContent())!.trim();
  expect(tracking).toMatch(/^876-[0-9]{8}$/);
  await expect(page.locator('[data-testid="receipt-qr"] svg')).toHaveCount(1);
  await expect(page.getByTestId("receipt-chargeable")).toContainText("kg");
  await expect(page.getByText("JFK → CDG")).toBeVisible();
  const url = (await page.getByText(/Track online:/).textContent())!.replace("Track online:", "").trim();
  expect(url).toBe(`http://localhost:3200/track/${tracking}`);

  await page.goto(url);
  await expect(page.getByRole("heading", { level: 1, name: "Booked" })).toBeVisible();
  await expect(page.getByText("Oct 23, 2026")).toBeVisible();
});
