import { test, Page } from "@playwright/test";
import { installMocks } from "./fixtures/demo-mocks";

/**
 * iPhone screenshots for App Store Connect. Final image 1290 x 2796
 * portrait — the only iPhone slot the ASC API exposes (APP_IPHONE_67;
 * there is no APP_IPHONE_69 enum yet). Captured at 430 x 932 CSS
 * pixels with deviceScaleFactor 3, matching iPhone 15 Pro Max's
 * actual on-device CSS dimensions so mobile-first layouts render
 * correctly instead of zoomed-out.
 */

const VW = 430;
const VH = 932;

test.use({
  viewport: { width: VW, height: VH },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  colorScheme: "light",
  defaultBrowserType: "chromium",
});

async function snap(page: Page, name: string) {
  await page.waitForTimeout(800);
  await page.screenshot({
    path: `screenshots/ios-iphone/${name}.png`,
    clip: { x: 0, y: 0, width: VW, height: VH },
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
