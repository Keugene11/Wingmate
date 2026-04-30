import { test, Page } from "@playwright/test";
import { installMocks } from "./fixtures/demo-mocks";

// Layout diagnostic on Android phone viewport. Logs key measurements and
// captures screenshots so we can eyeball the BottomNav padding / chat-input
// alignment / gray-band-when-typing fixes.

const SIM_INSET = 24; // simulated Android gesture-nav inset

async function setup(page: Page) {
  await page.addInitScript((px) => {
    const style = document.createElement("style");
    style.textContent = `
      :root { --nav-safe-bottom: ${px}px !important; }
      [data-test-safe-area-bottom] { height: ${px}px !important; }
    `;
    document.documentElement.appendChild(style);
    document.documentElement.classList.add("platform-android");
  }, SIM_INSET);
  await installMocks(page);
}

async function rect(page: Page, sel: string) {
  return await page.locator(sel).first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, height: r.height };
  });
}

async function snap(page: Page, name: string) {
  await page.screenshot({
    path: `screenshots/verify/${name}.png`,
    clip: { x: 0, y: 0, width: 412, height: 915 },
  });
}

test("today tab — nav fits within gesture-nav region", async ({ page }) => {
  await setup(page);
  await page.goto("/?tab=checkin");
  await page.waitForSelector("nav", { timeout: 15_000 });
  await page.waitForTimeout(500);

  const nav = await rect(page, "nav");
  const navStyle = await page.locator("nav").first().evaluate((el) => {
    const cs = getComputedStyle(el);
    return { paddingBottom: cs.paddingBottom };
  });
  const lastLink = await rect(page, "nav a:last-of-type");
  console.log("[today] nav:", nav, "paddingBottom:", navStyle.paddingBottom);
  console.log("[today] last link:", lastLink);
  console.log("[today] viewport bottom: 915, gesture-nav top:", 915 - SIM_INSET);
  console.log("[today] icons-end-to-gesture-nav clearance:", 915 - SIM_INSET - lastLink.bottom);

  await snap(page, "01_today");
});

test("wingmate tab — chat input clears nav", async ({ page }) => {
  await setup(page);
  await page.goto("/?tab=coach");
  await page.waitForSelector("textarea", { timeout: 15_000 });
  await page.waitForTimeout(800);

  const nav = await rect(page, "nav");
  const form = await rect(page, "form");
  console.log("[chat] nav:", nav);
  console.log("[chat] form:", form);
  console.log("[chat] gap (form_bottom → nav_top):", nav.top - form.bottom);

  await snap(page, "02_wingmate_chat");
});

test("plan tab — chat input clears nav, measure dead-space", async ({ page }) => {
  await setup(page);
  await page.goto("/?tab=plan");
  await page.waitForSelector("nav", { timeout: 15_000 });
  await page.waitForTimeout(1200);

  const nav = await rect(page, "nav");
  const form = await page.locator("form").last().evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, height: r.height };
  });
  console.log("[plan] nav:", nav);
  console.log("[plan] form (chat input):", form);
  console.log("[plan] dead-space below form to nav:", nav.top - form.bottom);

  await snap(page, "03_plan");
});

test("plan tab — focus textarea and check dead-space", async ({ page }) => {
  await setup(page);
  await page.goto("/?tab=plan");
  await page.waitForSelector("nav", { timeout: 15_000 });
  await page.waitForTimeout(1200);

  const ta = page.locator("form textarea").last();
  await ta.click();
  await ta.fill("Hi");
  await page.waitForTimeout(400);

  const nav = await rect(page, "nav");
  const form = await page.locator("form").last().evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom };
  });
  console.log("[plan-typing] nav top:", nav.top);
  console.log("[plan-typing] form bottom:", form.bottom);
  console.log("[plan-typing] dead-space:", nav.top - form.bottom);

  await snap(page, "04_plan_typing");
});

test("community new — autoFocus, measure layout", async ({ page }) => {
  await setup(page);
  await page.goto("/community/new");
  await page.waitForSelector("textarea", { timeout: 15_000 });
  await page.waitForTimeout(600);

  const ta = await rect(page, "textarea");
  console.log("[new-post] textarea:", ta);

  await snap(page, "05_new_post");
});
