import { expect, test } from "@playwright/test";

test.use({ launchOptions: { args: ["--disable-webgl", "--disable-webgl2", "--disable-3d-apis"] } });

test("without WebGL the landing shows the static hero and still works", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/");
  await expect(page.locator('img[src="/images/airport.svg"]').first()).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);

  await page.getByRole("link", { name: "Get a quote" }).first().click();
  await expect(page).toHaveURL(/\/quote$/);
  expect(errors).toEqual([]);
});
