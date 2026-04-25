import { test, Page } from "@playwright/test";
import { installMocks } from "./fixtures/demo-mocks";

/**
 * Tablet screenshots for the Play Store listing.
 * Captured on chromium (not iPad/WebKit) to avoid the status-bar chrome
 * that WebKit emulation bakes into iPad/iPhone shots. Written at 1200x1920
 * which satisfies Play Store's 7"/10" tablet size requirements.
 * Writes to screenshots/android-tablet/.
 *
 * The app is mobile-first with max-w-md centering, so the content renders
 * as a phone-width column in the middle of a tablet canvas. That's honest —
 * it's how the app looks on a tablet today.
 */

const TABLET_W = 1200;
const TABLET_H = 1920;

test.use({
  viewport: { width: TABLET_W, height: TABLET_H },
  deviceScaleFactor: 1,
  isMobile: false,
  hasTouch: true,
  colorScheme: "light",
  defaultBrowserType: "chromium",
});

async function snap(page: Page, name: string) {
  await page.waitForTimeout(800);
  await page.screenshot({
    path: `screenshots/android-tablet/${name}.png`,
    clip: { x: 0, y: 0, width: TABLET_W, height: TABLET_H },
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
