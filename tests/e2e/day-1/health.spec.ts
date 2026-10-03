import { expect, test } from "@playwright/test";

test("landing page shows the placeholder", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Brainworks" })).toBeVisible();
});

test("GET /api/health reports the app and database as ok", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ status: "ok", db: "ok" });
});
