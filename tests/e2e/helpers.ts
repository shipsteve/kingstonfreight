import { expect, type Page } from "@playwright/test";

export const ADMIN = { email: "admin@e2e.test", password: "e2e-admin-pass" };

export const uniqueEmail = (tag: string) => `${tag}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@e2e.test`;

export async function fillAddress(
  page: Page,
  prefix: "origin" | "destination",
  a: { name: string; line1: string; city: string; postcode: string; country: string },
) {
  await page.fill(`#${prefix}-name`, a.name);
  await page.fill(`#${prefix}-line1`, a.line1);
  await page.fill(`#${prefix}-city`, a.city);
  await page.fill(`#${prefix}-postcode`, a.postcode);
  if (await page.locator(`#${prefix}-country`).isEnabled()) await page.selectOption(`#${prefix}-country`, a.country);
}

export const NYC = { name: "Ann Sender", line1: "1 Main St", city: "New York", postcode: "10001", country: "US" };
export const PARIS = { name: "Claire Receiver", line1: "2 Rue de Rivoli", city: "Paris", postcode: "75001", country: "FR" };

export async function register(page: Page, email: string) {
  await page.fill("#name", "E2E Customer");
  await page.fill("#email", email);
  await page.fill("#password", "password123");
  await page.getByRole("button", { name: "Create account" }).click();
}

export async function login(page: Page, email: string, password: string, next = "/dashboard") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(new RegExp(`${next.replace(/\//g, "\\/")}$`));
}

export async function trackingNumberOn(page: Page): Promise<string> {
  const text = await page.locator("h1.font-mono").first().textContent();
  expect(text).toMatch(/^SHP-[A-Z0-9]{10}$/);
  return text!;
}
