// Captures a 1242x2688 (iPhone Xs Max) screenshot of the /winback-offer
// page from the local dev server, saved to public/winback-review-screenshot.png.
// Used as the App Store review screenshot for the wingmate_winback_yearly sub.
//
//   pnpm exec node scripts/screenshot-winback-offer.mjs

import { chromium, devices } from "playwright";
import { mkdirSync } from "fs";

const URL = "http://localhost:3000/winback-offer";
const OUT = "public/winback-review-screenshot.png";

mkdirSync("public", { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  ...devices["iPhone 13 Pro Max"],
  viewport: { width: 1242 / 3, height: 2688 / 3 },
  deviceScaleFactor: 3,
});
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: "networkidle" });
// Let any animations settle
await page.waitForTimeout(500);
await page.screenshot({ path: OUT, fullPage: false });
await browser.close();

console.log(`Saved ${OUT}`);
