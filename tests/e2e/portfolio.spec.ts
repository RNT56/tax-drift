import { expect, test } from "@playwright/test";

test("portfolio command center renders ranked actions", async ({ page }) => {
  await page.goto("/?demo=1");
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await expect(page.getByText("Ranked next actions", { exact: true })).toBeVisible();
  await expect(page.getByText("What needs attention first")).toBeVisible();
});

test("positions route exposes tax lots", async ({ page }) => {
  await page.goto("/positions?demo=1");
  await expect(page.getByText("Lots, basis, price freshness")).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Quality" })).toBeVisible();
});

test("core production workflows are exposed in React shell", async ({ page }) => {
  await page.goto("/assets?demo=1");
  await expect(page.getByLabel("Selected asset")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Search market data providers/ })).toBeHidden();
  await page.getByRole("button", { name: "Change asset" }).click();
  await expect(page.getByRole("heading", { name: /Search market data providers/ })).toBeVisible();
  await page.locator(".asset-picker .asset-result").first().click();
  await expect(page.getByRole("heading", { name: /Search market data providers/ })).toBeHidden();
  await expect(page.getByText("Tax-aware switch analysis", { exact: true })).toBeVisible();

  await page.goto("/data?demo=1");
  await expect(page.getByRole("heading", { name: "Position and FIFO basis" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Allocation target" })).toBeVisible();

  await page.goto("/decisions?demo=1");
  await expect(page.getByText("Compare hold, sell, rebuy, switch, and cash outcomes")).toBeVisible();
  await expect(page.getByText("Probability-weighted hold vs switch cases")).toBeVisible();

  await page.goto("/planner?demo=1");
  await expect(page.getByRole("button", { name: /Generate constrained plan/ })).toBeVisible();
});

test("mobile navigation uses bottom tabs and an all-sections drawer", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?demo=1");

  await expect(page.getByLabel("Primary mobile navigation")).toBeVisible();
  await expect(page.locator(".sidebar .nav-list")).toBeHidden();

  await page.getByRole("button", { name: "Open all workspace areas" }).click();
  await expect(page.getByRole("link", { name: /Reports: Exports/ })).toBeVisible();
  await page.getByRole("link", { name: /Reports: Exports/ }).click();

  await expect(page).toHaveURL(/\/reports$/);
  await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Reports: Exports/ })).toBeHidden();
});
