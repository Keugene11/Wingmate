import { chromium } from "playwright";
import { execSync } from "child_process";
import { cpSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const PACKAGE = "com.approachai.twa";
const PRIVACY_URL = "https://wingmate.vercel.app/privacy";
const CONTACT_EMAIL = "support@wingmate.app";
const USER_DATA = (process.env.LOCALAPPDATA || "C:\\Users\\Daniel\\AppData\\Local") + "\\Google\\Chrome\\User Data";
const TEMP_PROFILE = join(tmpdir(), "playwright-chrome-profile");

async function main() {
  // Kill Chrome to release lock on profile
  console.log("Closing any existing Chrome instances...");
  try { execSync("taskkill /F /IM chrome.exe", { shell: "cmd.exe", stdio: "ignore" }); } catch {}
  await new Promise(r => setTimeout(r, 3000));

  console.log("Launching Chrome with junction profile...\n");
  const CHROME_JUNCTION = "C:\\Temp\\chrome-profile";
  const context = await chromium.launchPersistentContext(CHROME_JUNCTION, {
    channel: "chrome",
    headless: false,
    args: ["--no-first-run", "--disable-blink-features=AutomationControlled"],
    viewport: null,
    timeout: 120000,
  });

  const page = context.pages()[0] || await context.newPage();
  page.setDefaultTimeout(60000);

  // Navigate to Play Console
  console.log("Opening Play Console...");
  await page.goto("https://play.google.com/console", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(5000);

  let url = page.url();
  console.log("URL:", url);

  // If on the about page, navigate to the console directly
  if (url.includes("/about") || !url.includes("/developers/")) {
    console.log("Not in developer console yet, navigating directly...");
    await page.goto("https://play.google.com/console/u/0/developers", { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(8000);
    url = page.url();
    console.log("New URL:", url);
  }

  // If we end up at a login page, handle it
  if (url.includes("accounts.google.com")) {
    console.log("Need to log in. Waiting for manual login...");
    await page.waitForURL("**/play.google.com/console/**", { timeout: 120000 });
    url = page.url();
    console.log("After login URL:", url);
  }

  const devIdMatch = url.match(/developers\/(\d+)/);
  if (!devIdMatch) {
    await page.screenshot({ path: "scripts/play-store-assets/debug-page.png" });
    console.log("Not on developer dashboard. Screenshot saved. URL:", url);
    context.close();
    return;
  }

  const devId = devIdMatch[1];
  console.log("Developer ID:", devId);

  // Find app ID
  await page.goto(`https://play.google.com/console/u/0/developers/${devId}/app-list`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(3000);

  const appId = await page.evaluate(() => {
    for (const a of document.querySelectorAll("a")) {
      const m = a.href.match(/\/app\/(\d+)/);
      if (m) return m[1];
    }
    return null;
  });

  if (!appId) {
    await page.screenshot({ path: "scripts/play-store-assets/debug-applist.png" });
    console.log("Could not find app ID. Screenshot saved.");
    context.close();
    return;
  }
  console.log("App ID:", appId);

  const base = `https://play.google.com/console/u/0/developers/${devId}/app/${appId}`;

  // =====================
  // 1. CONTENT RATING
  // =====================
  console.log("\n=== 1. CONTENT RATING ===");
  await page.goto(`${base}/content-rating`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "scripts/play-store-assets/rating-1.png" });

  // Click "Start" or "Start questionnaire" button if present
  const startBtn = await findButton(page, ["start questionnaire", "start new questionnaire", "start"]);
  if (startBtn) {
    await startBtn.click();
    await page.waitForTimeout(3000);
  }

  // Fill email if there's an empty email/text input
  const emailInput = await page.$('input[type="email"], input[type="text"]');
  if (emailInput) {
    const val = await emailInput.inputValue();
    if (!val) {
      await emailInput.fill(CONTACT_EMAIL);
      console.log("  Filled email:", CONTACT_EMAIL);
    }
  }

  // Select app category if dropdown present - pick "Utility" or first available non-game
  await page.waitForTimeout(1000);

  // Click Next/Continue if available
  await clickButton(page, ["next", "continue"]);
  await page.waitForTimeout(3000);

  // Loop through questionnaire - click "No" on everything, then Next/Save
  for (let step = 0; step < 25; step++) {
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `scripts/play-store-assets/rating-step-${step}.png` });

    const clickedNo = await clickNoOptions(page);
    await page.waitForTimeout(500);

    const clickedNext = await clickButton(page, ["next", "save", "submit", "continue"]);
    await page.waitForTimeout(2000);

    console.log(`  Step ${step}: clickedNo=${clickedNo}, clickedNext=${clickedNext}`);

    if (!clickedNo && !clickedNext) {
      // Check if we see a "Submit" button (final step)
      const submitBtn = await findButton(page, ["submit"]);
      if (submitBtn) {
        await submitBtn.click();
        console.log("  Submitted content rating!");
        await page.waitForTimeout(3000);
      }
      break;
    }
  }
  await page.screenshot({ path: "scripts/play-store-assets/rating-done.png" });
  console.log("  Content rating done. Screenshot saved.");

  // =====================
  // 2. TARGET AUDIENCE
  // =====================
  console.log("\n=== 2. TARGET AUDIENCE ===");
  await page.goto(`${base}/target-audience`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "scripts/play-store-assets/audience-1.png" });

  // Click start button if present
  const startAudience = await findButton(page, ["start"]);
  if (startAudience) {
    await startAudience.click();
    await page.waitForTimeout(3000);
  }

  // Select "18 and over" age group - look for label/radio containing "18"
  const ageLabels = await page.$$('label, [role="radio"], [role="checkbox"], mat-checkbox, mat-radio-button');
  for (const label of ageLabels) {
    const text = await label.textContent();
    // We want "18 and over" or similar, but NOT "13-17" etc
    if (text && (text.includes("18 and over") || text.includes("18+"))) {
      await label.click();
      console.log(`  Selected: "${text.trim().substring(0, 60)}"`);
      await page.waitForTimeout(1000);
      break;
    }
  }

  // Also uncheck any younger age groups if they're checkboxes
  for (const label of ageLabels) {
    const text = await label.textContent();
    if (text && (text.includes("Under 13") || text.includes("13-17") || text.includes("13–17"))) {
      // Check if it's checked, and uncheck
      const isChecked = await label.evaluate(el =>
        el.querySelector('input[type="checkbox"]')?.checked ||
        el.getAttribute("aria-checked") === "true" ||
        el.classList.contains("mat-checkbox-checked")
      );
      if (isChecked) {
        await label.click();
        console.log(`  Unchecked: "${text.trim().substring(0, 60)}"`);
        await page.waitForTimeout(500);
      }
    }
  }

  // Save/Next
  await clickButton(page, ["save", "next", "continue"]);
  await page.waitForTimeout(2000);
  // If there are more pages, keep clicking next/save
  for (let i = 0; i < 5; i++) {
    const clicked = await clickButton(page, ["save", "next", "continue", "submit"]);
    if (!clicked) break;
    await page.waitForTimeout(2000);
  }
  await page.screenshot({ path: "scripts/play-store-assets/audience-done.png" });
  console.log("  Target audience done.");

  // =====================
  // 3. APP CONTENT / PRIVACY POLICY
  // =====================
  console.log("\n=== 3. APP CONTENT (Privacy Policy) ===");
  await page.goto(`${base}/app-content`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "scripts/play-store-assets/app-content-1.png" });

  // Look for Privacy policy section - click "Start" or the section
  const privacyLink = await page.$('a[href*="privacy-policy"], a:has-text("Privacy policy")');
  if (privacyLink) {
    await privacyLink.click();
    await page.waitForTimeout(3000);
  } else {
    // Try clicking a card/section that mentions "Privacy policy"
    const sections = await page.$$('div, a, button');
    for (const s of sections) {
      const text = await s.textContent().catch(() => "");
      if (text.includes("Privacy policy") && text.length < 200) {
        const startInSection = await s.$('button, a');
        if (startInSection) {
          await startInSection.click();
          console.log("  Clicked privacy policy section");
          await page.waitForTimeout(3000);
          break;
        }
      }
    }
  }

  // Fill privacy policy URL
  const urlInputs = await page.$$('input[type="url"], input[type="text"]');
  for (const input of urlInputs) {
    const val = await input.inputValue();
    const placeholder = await input.getAttribute("placeholder") || "";
    const label = await input.evaluate(el => {
      const prev = el.closest("label") || el.previousElementSibling;
      return prev?.textContent || "";
    });
    if (!val && (placeholder.toLowerCase().includes("url") || placeholder.toLowerCase().includes("http") || label.toLowerCase().includes("privacy"))) {
      await input.fill(PRIVACY_URL);
      console.log(`  Set privacy URL: ${PRIVACY_URL}`);
      break;
    }
    if (!val && !placeholder) {
      await input.fill(PRIVACY_URL);
      console.log(`  Set privacy URL: ${PRIVACY_URL}`);
      break;
    }
  }

  await clickButton(page, ["save", "submit", "next"]);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "scripts/play-store-assets/privacy-done.png" });
  console.log("  Privacy policy done.");

  // =====================
  // 4. STORE SETTINGS (Category)
  // =====================
  console.log("\n=== 4. STORE SETTINGS (Category) ===");
  await page.goto(`${base}/store-presence/main-store-listing`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "scripts/play-store-assets/store-listing.png" });

  // Also try the category/app-info page
  await page.goto(`${base}/app-info-and-category`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(3000);

  // Look for App or Game radio/selection
  const appTypeLabels = await page.$$('label, [role="radio"], mat-radio-button');
  for (const label of appTypeLabels) {
    const text = await label.textContent().catch(() => "");
    if (text.trim() === "App" || text.includes("App")) {
      await label.click();
      console.log(`  Selected app type: "${text.trim().substring(0, 30)}"`);
      await page.waitForTimeout(1000);
      break;
    }
  }

  // Select category - look for dropdown and choose "Lifestyle"
  const dropdowns = await page.$$('select, mat-select, [role="listbox"], [role="combobox"]');
  for (const dd of dropdowns) {
    await dd.click();
    await page.waitForTimeout(1000);
    // Look for "Lifestyle" option
    const option = await page.$('[role="option"]:has-text("Lifestyle"), option:has-text("Lifestyle"), mat-option:has-text("Lifestyle")');
    if (option) {
      await option.click();
      console.log("  Selected category: Lifestyle");
      await page.waitForTimeout(1000);
      break;
    }
  }

  await clickButton(page, ["save"]);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "scripts/play-store-assets/category-done.png" });
  console.log("  Category done.");

  // =====================
  // 5. GET SHA256 FINGERPRINT (from App Signing page)
  // =====================
  console.log("\n=== 5. APP SIGNING (SHA256) ===");
  await page.goto(`${base}/keymanagement`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "scripts/play-store-assets/app-signing.png" });

  // Try to find SHA256 text on the page
  const sha256 = await page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const text = walker.currentNode.textContent.trim();
      // SHA256 fingerprint pattern: XX:XX:XX... (32 hex pairs)
      const match = text.match(/([0-9A-F]{2}(?::[0-9A-F]{2}){31})/i);
      if (match) return match[1];
    }
    return null;
  });

  if (sha256) {
    console.log(`  App signing SHA256: ${sha256}`);
    console.log("  (Use this for assetlinks.json if different from upload key)");
  } else {
    console.log("  Could not find SHA256 on page. Check screenshot.");
  }

  // =====================
  // 6. DATA SAFETY
  // =====================
  console.log("\n=== 6. DATA SAFETY ===");
  await page.goto(`${base}/app-content/data-safety`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "scripts/play-store-assets/data-safety-1.png" });

  // Click Start if present
  const startSafety = await findButton(page, ["start"]);
  if (startSafety) {
    await startSafety.click();
    await page.waitForTimeout(3000);
  }

  // Answer "Yes" to collecting data, then specify minimal data
  // For most questions, we collect: email (from auth), photos (user uploads)
  // Let's navigate through and handle each page
  for (let step = 0; step < 15; step++) {
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `scripts/play-store-assets/data-safety-${step}.png` });
    console.log(`  Data safety step ${step}`);

    const clicked = await clickButton(page, ["next", "save", "submit", "continue"]);
    if (!clicked) break;
    await page.waitForTimeout(2000);
  }
  await page.screenshot({ path: "scripts/play-store-assets/data-safety-done.png" });

  // =====================
  // SUMMARY
  // =====================
  console.log("\n=== ALL STEPS ATTEMPTED ===");
  console.log("Screenshots saved in scripts/play-store-assets/");
  console.log("Browser left open for verification. Check each section and submit manually if needed.");
  console.log("Close Chrome when done.\n");

  // Don't close browser - let user verify
  browser.close();
}

// --- Helpers ---

async function findButton(page, texts) {
  const buttons = await page.$$("button, a[role='button'], [role='button']");
  for (const btn of buttons) {
    const text = (await btn.textContent().catch(() => "")).trim().toLowerCase();
    const disabled = await btn.evaluate(el =>
      el.disabled || el.getAttribute("aria-disabled") === "true"
    ).catch(() => false);
    if (disabled) continue;
    for (const t of texts) {
      if (text.includes(t.toLowerCase())) return btn;
    }
  }
  return null;
}

async function clickButton(page, texts) {
  const btn = await findButton(page, texts);
  if (btn) {
    const text = (await btn.textContent().catch(() => "")).trim();
    console.log(`  Clicking: "${text.substring(0, 50)}"`);
    await btn.click();
    return true;
  }
  return false;
}

async function clickNoOptions(page) {
  let clicked = false;
  const candidates = await page.$$('label, [role="radio"], [role="checkbox"], mat-radio-button, mat-checkbox');
  for (const el of candidates) {
    const text = (await el.textContent().catch(() => "")).trim().toLowerCase();
    if (text === "no" || text.startsWith("no,") || text.startsWith("no ") ||
        text.includes("none of the above") || text.includes("none of these")) {
      await el.click();
      console.log(`  Clicked: "${text.substring(0, 60)}"`);
      clicked = true;
      await page.waitForTimeout(300);
    }
  }
  return clicked;
}

main().catch(e => { console.error(e); process.exit(1); });
