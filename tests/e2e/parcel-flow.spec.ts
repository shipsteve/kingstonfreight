import { expect, test } from "@playwright/test";
import { fillAddress, NYC, PARIS, register, trackingNumberOn, uniqueEmail } from "./helpers";

test("parcel: instant price logged out → register → booking restored → pay → track", async ({ page, request }) => {
  await page.goto("/quote");
  await page.getByRole("button", { name: /Parcel/ }).click();

  await fillAddress(page, "origin", NYC);
  await fillAddress(page, "destination", PARIS);
  await page.getByRole("button", { name: "Next" }).click();

  // default package (1 kg, 30×20×15) is fine
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText(/^\$\d[\d,]*\.\d{2}$/)).toBeVisible();

  await page.getByRole("button", { name: /Save & book/ }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fquote|\/login\?next=\/quote/);
  await page.getByRole("link", { name: "Create an account" }).click();
  await register(page, uniqueEmail("parcel"));

  // back on /quote with the draft restored at the price step
  await expect(page).toHaveURL(/\/quote$/);
  await expect(page.getByText(/^\$\d[\d,]*\.\d{2}$/)).toBeVisible();
  await page.getByRole("button", { name: "Save & book" }).click();

  await expect(page).toHaveURL(/\/quotes\//);
  await page.getByRole("button", { name: "Accept & pay" }).click();

  // No Stripe key in E2E: booking lands on the shipment page awaiting payment.
  await expect(page).toHaveURL(/\/shipments\/[^/?]+/);
  await expect(page.getByText("Awaiting payment").first()).toBeVisible();
  const shipmentId = new URL(page.url()).pathname.split("/").pop()!;

  // Stand-in for Stripe's checkout.session.completed webhook.
  const res = await request.post("/api/test/complete-checkout", { data: { shipmentId } });
  expect(await res.json()).toEqual({ result: "updated" });

  await page.reload();
  await expect(page.getByText("Paid", { exact: true })).toBeVisible();
  const tracking = await trackingNumberOn(page);

  await page.goto(`/track/${tracking.toLowerCase()}`);
  await expect(page.getByRole("heading", { level: 1, name: "Booked" })).toBeVisible();
  await expect(page.getByText("New York, United States")).toBeVisible();
  await expect(page.getByText("Paris, France")).toBeVisible();
  await expect(page.getByText("Ann Sender")).toHaveCount(0);
});
