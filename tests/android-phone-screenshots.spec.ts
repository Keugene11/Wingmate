import { test, expect } from "@playwright/test";

/**
 * Real phone-sized screenshots for the Play Store listing.
 * Against wingmate.live, 1080x1920 (9:16 Play Store phone spec).
 * Saves to screenshots/android-phone/.
 *
 * Strategy: walk the onboarding flow from welcome → planReady, snapping at
 * milestones we care about. Each step either:
 *   (a) has option cards in .onb-list → pick first, then click Next
 *   (b) has only Next (e.g. welcome, pitch, planIntro) → just click Next
 *   (c) has a slider / date picker / stars → try to click Next with defaults
 *
 * Tests are independent; each starts from /onboarding so a failure in one
 * doesn't block the others.
 */

test.use({
  viewport: { width: 540, height: 960 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  colorScheme: "light",
  defaultBrowserType: "chromium",
});

type Milestone = { name: string; marker: string | RegExp };

// Markers must match text rendered on the actual step so we recognise it.
const MILESTONES: Milestone[] = [
  { name: "01_welcome", marker: "Talk to more women" },
  { name: "02_status", marker: "What's your current status?" },
  { name: "03_approaches", marker: "How many girls do you talk to per week?" },
  { name: "04_pitch", marker: "Wingmate helps you talk to more girls" },
  { name: "05_goal", marker: "What is your goal?" },
  { name: "06_target", marker: "How many girls do you want to talk to per week?" },
  { name: "07_doable", marker: /totally doable/i },
  { name: "08_blockers", marker: "What's stopping you from reaching your goals?" },
  { name: "09_plan_ready", marker: "Your custom plan is ready" },
];

async function snapIfMatches(page: import("@playwright/test").Page, captured: Set<string>) {
  for (const m of MILESTONES) {
    if (captured.has(m.name)) continue;
    const hits = await page.getByText(m.marker, { exact: false }).count();
    if (hits > 0) {
      await page.waitForTimeout(700); // let animation settle
      await page.screenshot({ path: `screenshots/android-phone/${m.name}.png`, fullPage: false });
      captured.add(m.name);
      return m.name;
    }
  }
  return null;
}

async function advance(page: import("@playwright/test").Page): Promise<boolean> {
  // 1) If there are option cards in .onb-list, pick the first one.
  const optionBtn = page.locator(".onb-list button").first();
  if ((await optionBtn.count()) > 0) {
    await optionBtn.click({ trial: false }).catch(() => {});
    await page.waitForTimeout(250);
  }

  // 2) Click the Next button if it's enabled.
  const nextBtn = page.locator("button", {
    hasText: /^(Next|Continue|Let's go|Get started)$/,
  });
  if ((await nextBtn.count()) > 0) {
    const first = nextBtn.first();
    const disabled = await first.getAttribute("disabled");
    if (disabled === null) {
      await first.click().catch(() => {});
      await page.waitForTimeout(700);
      return true;
    }
  }

  return false;
}

test("walk onboarding and snap milestones", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/onboarding");
  await page.waitForSelector("text=Talk to more women", { timeout: 15_000 });

  const captured = new Set<string>();
  await snapIfMatches(page, captured);

  for (let hops = 0; hops < 40; hops++) {
    const advanced = await advance(page);
    if (!advanced) break;
    await snapIfMatches(page, captured);
    if (captured.size >= MILESTONES.length) break;
  }

  console.log("captured:", Array.from(captured));
  expect(captured.size).toBeGreaterThanOrEqual(3);
});

test("plans pricing page", async ({ page }) => {
  await page.goto("/plans");
  await page.waitForSelector("text=Pro Yearly", { timeout: 15_000 });
  await page.waitForTimeout(700);
  await page.screenshot({ path: "screenshots/android-phone/10_plans.png", fullPage: false });
});
