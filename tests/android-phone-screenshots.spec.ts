import { test, Page } from "@playwright/test";
import { installMocks } from "./fixtures/demo-mocks";

/**
 * Phone screenshots for the Play Store listing (540x960 viewport,
 * dsr 2 → 1080x1920 PNG, 9:16 Play Store phone spec).
 * Writes to screenshots/android-phone/.
 */

test.use({
  viewport: { width: 540, height: 960 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  colorScheme: "light",
  defaultBrowserType: "chromium",
});

async function snap(page: Page, name: string) {
  await page.waitForTimeout(800); // let animations settle
  await page.screenshot({
    path: `screenshots/android-phone/${name}.png`,
    clip: { x: 0, y: 0, width: 540, height: 960 },
  });
}

test("01 — onboarding welcome", async ({ page }) => {
  await installMocks(page, { signedIn: false });
  await page.goto("/onboarding");
  await page.waitForSelector("text=Overcome approach anxiety", { timeout: 15_000 });
  await snap(page, "01_welcome");
});

test("02 — today tab", async ({ page }) => {
  await installMocks(page);
  await page.goto("/?tab=checkin");
  await page.waitForSelector("text=/streak/i", { timeout: 15_000 });
  await snap(page, "02_today");
});

test("03 — plan tab", async ({ page }) => {
  await installMocks(page);
  await page.goto("/?tab=plan");
  await page.waitForSelector("text=Your Plan", { timeout: 15_000 });
  await page.waitForSelector("text=/conversation/i", { timeout: 10_000 });
  await snap(page, "03_plan");
});

test("04 — coach tab", async ({ page }) => {
  await installMocks(page);
  await page.goto("/?tab=coach");
  await page.waitForSelector("text=/what.s going on|keeping you from|tell me/i", { timeout: 15_000 });
  await page.waitForTimeout(1200);
  await snap(page, "04_coach");
});

test("05 — community tab", async ({ page }) => {
  await installMocks(page);
  await page.goto("/?tab=community");
  await page.waitForSelector("text=/Been using Wingmate/i", { timeout: 15_000 });
  await snap(page, "05_community");
});

test("06 — plans pricing", async ({ page }) => {
  await installMocks(page);
  await page.goto("/plans");
  await page.waitForSelector("text=Pro Yearly", { timeout: 15_000 });
  await snap(page, "06_plans");
});
