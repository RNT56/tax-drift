import { expect, test } from "@playwright/test";

test("portfolio command center renders ranked actions", async ({ page }) => {
  await page.goto("/portfolio.html");
  await expect(page.getByRole("heading", { name: "Portfolio" })).toBeVisible();
  await expect(page.getByText("Ranked next actions")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Reconnect broker data before taking portfolio decisions" })).toBeVisible();
});

test("positions route exposes tax lots", async ({ page }) => {
  await page.goto("/portfolio.html");
  await page.getByRole("button", { name: "Positions" }).click();
  await expect(page.getByText("FIFO lots")).toBeVisible();
  await expect(page.getByText("Estimated sale tax", { exact: true })).toBeVisible();
});
