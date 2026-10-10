import { expect, test } from "@playwright/test";
import { ADMIN, fillAddress, login, NYC, PARIS, randomTxHash, register, trackingNumberOn, uniqueEmail } from "./helpers";

test("register, fund wallet, admin approves, staff-priced quote, pay from balance, track", async ({ browser }) => {
  const customer = await (await browser.newContext()).newPage();
  const admin = await (await browser.newContext()).newPage();
  const email = uniqueEmail("wallet");
  const tx = randomTxHash();

  // 1. Register (terms required): the account starts pending
  await customer.goto("/register");
  await register(customer, email);
  await expect(customer).toHaveURL(/\/dashboard$/);
  await expect(customer.getByText("Your account is pending approval.")).toBeVisible();

  // 2. Submit a $60 BTC top-up
  await customer.goto("/account/wallet");
  await customer.fill("#amount", "60");
  await customer.fill("#txHash", tx);
  await customer.getByRole("button", { name: "Submit payment" }).click();
  await expect(customer.getByText("Under review")).toBeVisible();
  await expect(customer.getByTestId("balance")).toHaveText("$0.00");

  // 3. Admin verifies and approves
  await login(admin, ADMIN.email, ADMIN.password, "/admin/funding");
  const topUp = admin.locator("[data-slot=card]", { hasText: tx });
  await expect(topUp.getByText("First top-up")).toBeVisible();
  await topUp.getByLabel("Credit (USD)").fill("60");
  await topUp.getByRole("button", { name: "Approve" }).click();
  await expect(admin.getByText("Approved and credited")).toBeVisible();

  // 4. Customer is approved with $60
  await customer.reload();
  await expect(customer.getByTestId("balance")).toHaveText("$60.00");
  await expect(customer.getByText("Account approved")).toBeVisible();

  // 5. Customer requests a parcel quote (no instant price)
  await customer.goto("/quote");
  await customer.getByRole("button", { name: /Parcel/ }).click();
  await fillAddress(customer, "origin", NYC);
  await fillAddress(customer, "destination", PARIS);
  await customer.getByRole("button", { name: "Next" }).click();
  await customer.getByRole("button", { name: "Next" }).click();
  await expect(customer.getByText("Our team will price this for you")).toBeVisible();
  await customer.getByRole("button", { name: "Submit request" }).click();
  await expect(customer).toHaveURL(/\/quotes\//);
  await expect(customer.getByText("Awaiting our team")).toBeVisible();

  // 6. Admin prices it at $25
  await admin.goto("/admin/quotes");
  const quote = admin.locator("[data-slot=card]", { hasText: email });
  await quote.getByLabel("Price (USD)").fill("25");
  await quote.getByRole("button", { name: "Send price" }).click();
  await expect(admin.getByText("Quote priced and customer emailed")).toBeVisible();

  // 7. Customer accepts, paying from balance
  await customer.reload();
  await expect(customer.getByText("$25.00")).toBeVisible();
  await customer.getByRole("button", { name: "Accept & pay from balance" }).click();
  await expect(customer).toHaveURL(/\/shipments\//);
  const tracking = await trackingNumberOn(customer);
  await expect(customer.getByText("Account balance")).toBeVisible();

  // 8. Balance reduced; public tracking works without personal details
  await customer.goto("/account/wallet");
  await expect(customer.getByTestId("balance")).toHaveText("$35.00");
  const pub = await (await browser.newContext()).newPage();
  await pub.goto(`/track/${tracking.toLowerCase()}`);
  await expect(pub.getByRole("heading", { level: 1, name: "Booked" })).toBeVisible();
  await expect(pub.getByText("Ann Sender")).toHaveCount(0);
});

test("pending accounts are pointed to Add funds", async ({ page }) => {
  await page.goto("/register");
  await register(page, uniqueEmail("pending"));
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("link", { name: "Add funds" })).toBeVisible();
});
