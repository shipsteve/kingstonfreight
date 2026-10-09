import { expect, test } from "@playwright/test";
import { ADMIN, fillAddress, login, NYC, PARIS, register, trackingNumberOn, uniqueEmail } from "./helpers";

test("freight: request → admin prices → customer accepts → admin updates → public tracking", async ({ browser }) => {
  const customer = await (await browser.newContext()).newPage();
  const admin = await (await browser.newContext()).newPage();

  // Customer registers first, then requests freight.
  await customer.goto("/register?next=/quote");
  await register(customer, uniqueEmail("freight"));
  await expect(customer).toHaveURL(/\/quote$/);

  await customer.getByRole("button", { name: /Freight/ }).click();
  await fillAddress(customer, "origin", NYC);
  await fillAddress(customer, "destination", PARIS);
  await customer.getByRole("button", { name: "Next" }).click();
  await customer.fill("#pkg-0-weightKg", "800");
  await customer.fill("#cargoType", "Pallets");
  await customer.fill("#description", "Two pallets of machine parts");
  await customer.getByRole("button", { name: "Next" }).click();
  await customer.getByRole("button", { name: "Submit request" }).click();
  await expect(customer).toHaveURL(/\/quotes\//);
  await expect(customer.getByText("Awaiting our team")).toBeVisible();

  // Admin prices it.
  await login(admin, ADMIN.email, ADMIN.password, "/admin/quotes");
  const card = admin.locator("[data-slot=card]", { hasText: "Two pallets of machine parts" });
  await card.getByLabel("Price (USD)").fill("1250");
  await card.getByLabel("Note to customer").fill("Includes port fees");
  await card.getByRole("button", { name: "Send price" }).click();
  await expect(admin.getByText("Quote priced and customer emailed")).toBeVisible();

  // Customer sees the price and accepts.
  await customer.reload();
  await expect(customer.getByText("$1,250.00")).toBeVisible();
  await customer.getByRole("button", { name: "Accept quote" }).click();
  await expect(customer).toHaveURL(/\/shipments\//);
  const tracking = await trackingNumberOn(customer);

  // Admin posts a pickup.
  await admin.goto(`/admin/shipments?q=${tracking}`);
  await admin.getByRole("link", { name: tracking }).click();
  await admin.selectOption("#status", "PICKED_UP");
  await admin.fill("#location", "Newark warehouse");
  await admin.selectOption("#countryCode", "US");
  await admin.getByRole("button", { name: "Post update" }).click();
  await expect(admin.getByText("Update posted and customer emailed")).toBeVisible();

  // Anyone can track it.
  const pub = await (await browser.newContext()).newPage();
  await pub.goto(`/track/${tracking}`);
  await expect(pub.getByRole("heading", { level: 1, name: "Picked up" })).toBeVisible();
  await expect(pub.getByText("Newark warehouse").first()).toBeVisible();
});
