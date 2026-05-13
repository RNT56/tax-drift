import { expect, test } from "@playwright/test";

test("portfolio command center renders ranked actions", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await expect(page.getByText("Ranked next actions", { exact: true })).toBeVisible();
  await expect(page.getByText("What needs attention first")).toBeVisible();
});

test("positions route exposes tax lots", async ({ page }) => {
  await page.goto("/positions");
  await expect(page.getByText("Lots, basis, price freshness")).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Quality" })).toBeVisible();
});

test("core production workflows are exposed in React shell", async ({ page }) => {
  await page.goto("/assets");
  await expect(page.getByRole("heading", { name: /Search market data providers/ })).toBeVisible();
  await expect(page.getByText("Tax-aware switch analysis", { exact: true })).toBeVisible();

  await page.goto("/data");
  await expect(page.getByRole("heading", { name: "Position and FIFO basis" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Allocation target" })).toBeVisible();

  await page.goto("/decisions");
  await expect(page.getByText("Compare hold, sell, rebuy, switch, and cash outcomes")).toBeVisible();
  await expect(page.getByText("Probability-weighted hold vs switch cases")).toBeVisible();

  await page.goto("/planner");
  await expect(page.getByRole("button", { name: /Generate constrained plan/ })).toBeVisible();
});
