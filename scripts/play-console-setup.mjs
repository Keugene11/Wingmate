import { chromium } from "playwright";
import { execSync } from "child_process";
import { readFileSync, copyFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import Database from "better-sqlite3";

const CHROME_PROFILE = "Profile 2";
const USER_DATA = "C:\\Users\\Daniel\\AppData\\Local\\Google\\Chrome\\User Data";
const PRIVACY_URL = "https://wingmate.vercel.app/privacy";
const CONTACT_EMAIL = "support@wingmate.app";

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// --- Decrypt Chrome cookies using DPAPI ---
function decryptMasterKey() {
  const localState = JSON.parse(readFileSync(join(USER_DATA, "Local State"), "utf8"));
  const encKeyB64 = localState.os_crypt.encrypted_key;
  const encKey = Buffer.from(encKeyB64, "base64");

  // Remove "DPAPI" prefix (first 5 bytes)
  const dpapiBlob = encKey.slice(5);

  // Use PowerShell to decrypt with DPAPI via temp script file
  const b64Blob = dpapiBlob.toString("base64");
  const psScript = join(tmpdir(), "dpapi-decrypt.ps1");
  writeFileSync(psScript, `
Add-Type -AssemblyName System.Security
$blob = [Convert]::FromBase64String('${b64Blob}')
$decrypted = [System.Security.Cryptography.ProtectedData]::Unprotect($blob, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser)
[Convert]::ToBase64String($decrypted)
`);
  const result = execSync(`powershell.exe -ExecutionPolicy Bypass -File "${psScript}"`, { encoding: "utf8" }).trim();
  return Buffer.from(result, "base64");
}


async function extractCookies(domains) {
  console.log("Extracting Chrome cookies...");
  const masterKey = decryptMasterKey();
  console.log("  Master key decrypted.");

  // Copy cookies DB to avoid lock issues - use robocopy for locked files
  const srcDir = join(USER_DATA, CHROME_PROFILE, "Network");
  const tmpDir = join(tmpdir(), "chrome-cookies-tmp");
  const tmpDb = join(tmpDir, "Cookies");
  try {
    execSync(`robocopy "${srcDir}" "${tmpDir}" Cookies /NFL /NDL /NJH /NJS /nc /ns /np`, { shell: "cmd.exe", stdio: "ignore" });
  } catch {
    // robocopy returns non-zero for success, ignore
  }

  const db = new Database(tmpDb, { readonly: true });
  const crypto = await import("crypto");

  const cookies = [];
  const domainFilter = domains.map(d => `host_key LIKE '%${d}%'`).join(" OR ");
  const rows = db.prepare(`SELECT host_key, name, path, encrypted_value, is_secure, is_httponly, expires_utc, samesite FROM cookies WHERE ${domainFilter}`).all();

  console.log(`  Found ${rows.length} cookies for ${domains.join(", ")}`);

  for (const row of rows) {
    const enc = row.encrypted_value;
    if (!enc || enc.length <= 3) continue;

    const version = enc.slice(0, 3).toString();
    if (version !== "v10" && version !== "v20") continue;

    const nonce = enc.slice(3, 15);
    const ciphertextWithTag = enc.slice(15);
    const tag = ciphertextWithTag.slice(-16);
    const ciphertext = ciphertextWithTag.slice(0, -16);

    try {
      const decipher = crypto.createDecipheriv("aes-256-gcm", masterKey, nonce);
      decipher.setAuthTag(tag);
      const value = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");

      // Convert Chrome's epoch (microseconds since 1601-01-01) to unix timestamp
      const chromeEpochOffset = 11644473600n;
      const expiry = row.expires_utc ? Number(BigInt(row.expires_utc) / 1000000n - chromeEpochOffset) : -1;

      cookies.push({
        name: row.name,
        value,
        domain: row.host_key,
        path: row.path || "/",
        expires: expiry > 0 ? expiry : undefined,
        httpOnly: !!row.is_httponly,
        secure: !!row.is_secure,
        sameSite: row.samesite === 1 ? "Lax" : row.samesite === 2 ? "Strict" : "None",
      });
    } catch {}
  }

  db.close();
  console.log(`  Decrypted ${cookies.length} cookies.`);
  return cookies;
}

async function main() {
  // Make sure Chrome is closed so we can read the cookie DB
  try { execSync("taskkill /F /IM chrome.exe", { shell: "cmd.exe", stdio: "ignore" }); } catch {}
  await sleep(2000);

  // Extract Google cookies
  const cookies = await extractCookies([".google.com", "play.google.com", "accounts.google.com", ".googleapis.com"]);

  if (cookies.length === 0) {
    console.error("No Google cookies found! Make sure you're logged into Google in Chrome Profile 2.");
    return;
  }

  // Launch Playwright with its own Chromium
  console.log("\nLaunching browser...");
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
  });

  // Inject cookies
  console.log("Injecting cookies...");
  await context.addCookies(cookies);

  const page = await context.newPage();

  // Navigate to Play Console
  console.log("\nNavigating to Play Console...");
  await page.goto("https://play.google.com/console/u/0/developers", { timeout: 60000, waitUntil: "domcontentloaded" });
  await sleep(8000);

  let url = page.url();
  console.log("URL:", url);
  await page.screenshot({ path: "scripts/play-store-assets/step-login.png" });

  // If redirected to about page, try direct developer URL
  if (url.includes("/about")) {
    console.log("Redirected to about. Trying direct link...");
    await page.goto("https://play.google.com/console/developers", { timeout: 60000 });
    await sleep(8000);
    url = page.url();
    console.log("URL:", url);
    await page.screenshot({ path: "scripts/play-store-assets/step-login2.png" });
  }

  if (url.includes("accounts.google.com")) {
    console.log("Login required. Cookies may have expired. Waiting 2 min for manual login...");
    await page.screenshot({ path: "scripts/play-store-assets/login-needed.png" });
    try {
      await page.waitForURL("**/play.google.com/console/**", { timeout: 120000 });
      url = page.url();
    } catch {
      console.log("Login timed out.");
      browser.close();
      return;
    }
  }

  const devIdMatch = url.match(/developers\/(\d+)/);
  if (!devIdMatch) {
    await page.screenshot({ path: "scripts/play-store-assets/debug-final.png" });
    console.log("Could not find developer ID. URL:", url);
    console.log("Check debug-final.png");
    browser.close();
    return;
  }

  const devId = devIdMatch[1];
  console.log("Developer ID:", devId);

  // Find app
  await page.goto(`https://play.google.com/console/u/0/developers/${devId}/app-list`, { timeout: 60000 });
  await sleep(5000);

  const appId = await page.evaluate(() => {
    for (const a of document.querySelectorAll("a")) {
      const m = a.href.match(/\/app\/(\d+)/);
      if (m) return m[1];
    }
    return null;
  });

  if (!appId) {
    await page.screenshot({ path: "scripts/play-store-assets/debug-noapp.png" });
    console.log("Could not find app.");
    browser.close();
    return;
  }
  console.log("App ID:", appId);

  const base = `https://play.google.com/console/u/0/developers/${devId}/app/${appId}`;

  // =====================
  // SETUP CHECKLIST
  // =====================

  // 1. PRIVACY POLICY
  console.log("\n=== 1. PRIVACY POLICY ===");
  await page.goto(`${base}/app-content/privacy-policy`, { timeout: 60000 });
  await sleep(5000);
  await page.screenshot({ path: "scripts/play-store-assets/privacy-1.png" });
  await tryFillInput(page, PRIVACY_URL);
  await sleep(500);
  await tryClick(page, ["save"]);
  await sleep(3000);
  await page.screenshot({ path: "scripts/play-store-assets/privacy-done.png" });
  console.log("  Done.");

  // 2. APP ACCESS
  console.log("\n=== 2. APP ACCESS ===");
  await page.goto(`${base}/app-content/app-access`, { timeout: 60000 });
  await sleep(5000);
  await page.screenshot({ path: "scripts/play-store-assets/access-1.png" });
  await tryClickRadio(page, ["all functionality", "without special access"]);
  await sleep(500);
  await tryClick(page, ["save"]);
  await sleep(3000);
  await page.screenshot({ path: "scripts/play-store-assets/access-done.png" });
  console.log("  Done.");

  // 3. ADS
  console.log("\n=== 3. ADS ===");
  await page.goto(`${base}/app-content/ads`, { timeout: 60000 });
  await sleep(5000);
  await tryClickRadio(page, ["no, my app does not", "does not contain ads"]);
  await sleep(500);
  await tryClick(page, ["save"]);
  await sleep(3000);
  await page.screenshot({ path: "scripts/play-store-assets/ads-done.png" });
  console.log("  Done.");

  // 4. CONTENT RATING
  console.log("\n=== 4. CONTENT RATING ===");
  await page.goto(`${base}/content-rating`, { timeout: 60000 });
  await sleep(5000);
  await page.screenshot({ path: "scripts/play-store-assets/rating-1.png" });

  await tryClick(page, ["start questionnaire", "start new", "start"]);
  await sleep(3000);
  await tryFillInput(page, CONTACT_EMAIL);
  await sleep(500);

  // Select app category
  await tryClickRadio(page, ["utility", "all other app types", "communication"]);
  await sleep(1000);
  await tryClick(page, ["next"]);
  await sleep(3000);

  // Answer No to all questions, click Next
  for (let step = 0; step < 20; step++) {
    await page.screenshot({ path: `scripts/play-store-assets/rating-${step}.png` });
    const no = await tryClickRadio(page, ["no"]);
    await sleep(500);
    const nav = await tryClick(page, ["next", "save", "submit"]);
    await sleep(3000);
    console.log(`  Step ${step}: no=${no}, nav=${nav}`);
    if (!no && !nav) break;
  }
  await page.screenshot({ path: "scripts/play-store-assets/rating-done.png" });
  console.log("  Done.");

  // 5. TARGET AUDIENCE
  console.log("\n=== 5. TARGET AUDIENCE ===");
  await page.goto(`${base}/target-audience`, { timeout: 60000 });
  await sleep(5000);
  await page.screenshot({ path: "scripts/play-store-assets/audience-1.png" });

  await tryClick(page, ["start"]);
  await sleep(3000);
  await tryClickRadio(page, ["18 and over", "18+"]);
  await sleep(1000);

  for (let i = 0; i < 5; i++) {
    const nav = await tryClick(page, ["next", "save", "submit"]);
    if (!nav) break;
    await sleep(3000);
  }
  await page.screenshot({ path: "scripts/play-store-assets/audience-done.png" });
  console.log("  Done.");

  // 6. NEWS APP
  console.log("\n=== 6. NEWS APP ===");
  await page.goto(`${base}/app-content/news-app`, { timeout: 60000 });
  await sleep(5000);
  await tryClickRadio(page, ["no"]);
  await sleep(500);
  await tryClick(page, ["save"]);
  await sleep(3000);
  console.log("  Done.");

  // 7. GOVERNMENT APPS
  console.log("\n=== 7. GOVERNMENT APPS ===");
  await page.goto(`${base}/app-content/government-apps`, { timeout: 60000 });
  await sleep(5000);
  await tryClickRadio(page, ["no"]);
  await sleep(500);
  await tryClick(page, ["save"]);
  await sleep(3000);
  console.log("  Done.");

  // 8. DATA SAFETY
  console.log("\n=== 8. DATA SAFETY ===");
  await page.goto(`${base}/app-content/data-safety`, { timeout: 60000 });
  await sleep(5000);
  await page.screenshot({ path: "scripts/play-store-assets/safety-1.png" });

  await tryClick(page, ["start", "begin"]);
  await sleep(3000);

  for (let step = 0; step < 25; step++) {
    await page.screenshot({ path: `scripts/play-store-assets/safety-${step}.png` });
    const text = await page.evaluate(() => document.body.innerText.substring(0, 3000));
    console.log(`  Safety step ${step}: ${text.substring(0, 100).replace(/\n/g, " ")}...`);

    // Default: try "No" for most questions, "Yes" for encryption
    if (text.includes("encrypt") || text.includes("transit")) {
      await tryClickRadio(page, ["yes", "all user data"]);
    } else {
      await tryClickRadio(page, ["no"]);
    }
    await sleep(500);

    const nav = await tryClick(page, ["next", "save", "submit", "continue"]);
    await sleep(3000);
    if (!nav) break;
  }
  await page.screenshot({ path: "scripts/play-store-assets/safety-done.png" });
  console.log("  Done.");

  // 9. STORE SETTINGS / CATEGORY
  console.log("\n=== 9. CATEGORY ===");
  await page.goto(`${base}/category`, { timeout: 60000 });
  await sleep(5000);
  await page.screenshot({ path: "scripts/play-store-assets/category-1.png" });

  await tryClickRadio(page, ["app"]);
  await sleep(1000);

  // Click any dropdown and select Lifestyle
  const dropdowns = await page.$$('[role="listbox"], select, [role="combobox"]');
  for (const dd of dropdowns) {
    try {
      if (await dd.isVisible()) {
        await dd.click();
        await sleep(1000);
        const opt = await page.$('[role="option"]:has-text("Lifestyle"), option:has-text("Lifestyle")');
        if (opt) { await opt.click(); console.log("  Selected Lifestyle"); break; }
      }
    } catch {}
  }

  await tryClick(page, ["save"]);
  await sleep(3000);
  console.log("  Done.");

  // 10. GET SIGNING KEY SHA256
  console.log("\n=== 10. APP SIGNING SHA256 ===");
  await page.goto(`${base}/keymanagement`, { timeout: 60000 });
  await sleep(5000);
  await page.screenshot({ path: "scripts/play-store-assets/signing.png", fullPage: true });

  const sha256 = await page.evaluate(() => {
    const text = document.body.innerText;
    const match = text.match(/([0-9A-F]{2}(?::[0-9A-F]{2}){31})/i);
    return match ? match[1] : null;
  });
  if (sha256) {
    console.log(`  Google signing SHA256: ${sha256}`);
  } else {
    console.log("  SHA256 not found on page. Check signing.png");
  }

  // FINAL DASHBOARD
  console.log("\n=== FINAL DASHBOARD ===");
  await page.goto(`${base}/app-dashboard`, { timeout: 60000 });
  await sleep(5000);
  await page.screenshot({ path: "scripts/play-store-assets/final-dashboard.png", fullPage: true });
  console.log("Final dashboard saved.");

  console.log("\n=== COMPLETE ===");
  console.log("Check screenshots in scripts/play-store-assets/");
  await browser.close();
}

// --- Helpers ---

async function tryClick(page, texts) {
  const buttons = await page.$$("button, a[role='button'], [role='button']");
  for (const btn of buttons) {
    try {
      const visible = await btn.isVisible();
      if (!visible) continue;
      const text = (await btn.textContent()).trim().toLowerCase();
      const disabled = await btn.evaluate(el => el.disabled || el.getAttribute("aria-disabled") === "true");
      if (disabled) continue;
      for (const t of texts) {
        if (text.includes(t.toLowerCase())) {
          console.log(`  Click: "${text.substring(0, 50)}"`);
          await btn.click();
          return true;
        }
      }
    } catch {}
  }
  return false;
}

async function tryClickRadio(page, texts) {
  let clicked = false;
  const els = await page.$$('label, [role="radio"], [role="checkbox"], [role="option"]');
  for (const el of els) {
    try {
      const visible = await el.isVisible();
      if (!visible) continue;
      const text = (await el.textContent()).trim().toLowerCase();
      for (const t of texts) {
        const tl = t.toLowerCase();
        const match = tl === "no"
          ? (text === "no" || text.startsWith("no,") || text.startsWith("no "))
          : text.includes(tl);
        if (match) {
          console.log(`  Select: "${text.substring(0, 60)}"`);
          await el.click();
          clicked = true;
          await sleep(300);
          break;
        }
      }
    } catch {}
  }
  return clicked;
}

async function tryFillInput(page, value) {
  const inputs = await page.$$('input[type="url"], input[type="email"], input[type="text"]');
  for (const input of inputs) {
    try {
      const visible = await input.isVisible();
      const val = await input.inputValue();
      if (visible && !val) {
        await input.fill(value);
        console.log(`  Filled: ${value}`);
        return true;
      }
    } catch {}
  }
  return false;
}

main().catch(e => { console.error(e); process.exit(1); });
