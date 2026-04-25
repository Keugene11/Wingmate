// Replace the Play Store phone and tablet screenshots with the real ones
// captured by Playwright (see tests/android-{phone,tablet}-screenshots.spec.ts).
//
// Flow: JWT auth → create edit → for each slot (phone, 7-inch, 10-inch):
//   delete existing screenshots → upload new PNGs → commit.
// Listing text and feature graphic are left untouched.
//
// Prereq: screenshots/android-phone/*.png and screenshots/android-tablet/*.png
// exist from the Playwright runs.

import { readFileSync, existsSync } from "fs";
import { createSign } from "crypto";
import path from "path";

const SA_PATH = "c:/Users/Daniel/Downloads/voicenote-pro-484818-6d6db67c7fdb.json";
const PACKAGE = "com.approachai.twa";
const LANGUAGE = "en-US";

// Play Store allows up to 8 screenshots per slot. Order = order shown.
const PHONE_SHOTS = [
  "screenshots/android-phone/01_welcome.png",
  "screenshots/android-phone/02_today.png",
  "screenshots/android-phone/03_plan.png",
  "screenshots/android-phone/04_coach.png",
  "screenshots/android-phone/05_community.png",
  "screenshots/android-phone/06_plans.png",
];

const TABLET_SHOTS = [
  "screenshots/android-tablet/01_welcome.png",
  "screenshots/android-tablet/02_today.png",
  "screenshots/android-tablet/03_plan.png",
  "screenshots/android-tablet/04_coach.png",
  "screenshots/android-tablet/05_community.png",
  "screenshots/android-tablet/06_plans.png",
];

const SLOTS = [
  { name: "phoneScreenshots", label: "phone", files: PHONE_SHOTS },
  { name: "sevenInchScreenshots", label: "7-inch tablet", files: TABLET_SHOTS },
  { name: "tenInchScreenshots", label: "10-inch tablet", files: TABLET_SHOTS },
];

const sa = JSON.parse(readFileSync(SA_PATH, "utf8"));

function jwt() {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: sa.token_uri,
    iat: now,
    exp: now + 3600,
  })).toString("base64url");
  const sig = createSign("RSA-SHA256").update(`${header}.${payload}`).sign(sa.private_key, "base64url");
  return `${header}.${payload}.${sig}`;
}

async function getToken() {
  const res = await fetch(sa.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt()}`,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Auth failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

const BASE = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE}`;

async function api(token, method, route, body) {
  const res = await fetch(`${BASE}/${route}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body || undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${route} → ${res.status}: ${text}`);
  return text ? JSON.parse(text) : {};
}

async function uploadPng(token, editId, slot, buffer) {
  const url = `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${PACKAGE}/edits/${editId}/listings/${LANGUAGE}/${slot}?uploadType=media`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "image/png" },
    body: buffer,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Upload ${res.status}: ${text}`);
  return JSON.parse(text);
}

async function main() {
  console.log("Authenticating...");
  const token = await getToken();
  console.log("OK\n");

  // Validate files before creating an edit so we don't leave half-uploaded state.
  for (const slot of SLOTS) {
    for (const file of slot.files) {
      if (!existsSync(file)) {
        const hint = slot.label === "phone"
          ? "Run `pnpm playwright test --project=android-phone` first."
          : "Run `node scripts/build-tablet-screenshots.mjs` first (it composites phone shots onto tablet canvases).";
        throw new Error(`Missing: ${file}. ${hint}`);
      }
    }
  }

  console.log("Creating edit...");
  const edit = await api(token, "POST", "edits", "{}");
  const editId = edit.id;
  console.log(`Edit: ${editId}\n`);

  for (const slot of SLOTS) {
    console.log(`--- ${slot.label} (${slot.name}) ---`);
    console.log("Deleting existing...");
    await api(token, "DELETE", `edits/${editId}/listings/${LANGUAGE}/${slot.name}`);

    console.log(`Uploading ${slot.files.length} screenshots...`);
    for (const file of slot.files) {
      const buf = readFileSync(file);
      await uploadPng(token, editId, slot.name, buf);
      console.log(`  ✓ ${path.basename(file)}  (${(buf.length / 1024).toFixed(0)} KB)`);
    }
    console.log("");
  }

  console.log("Committing edit...");
  const commit = await api(token, "POST", `edits/${editId}:commit`);
  console.log(`Committed edit ${commit.id}`);

  console.log("\n=== DONE ===");
  console.log("Phone + 7-inch + 10-inch screenshots replaced on the en-US Play Store listing.");
  console.log("Play Console may take a few minutes to reflect the change.");
}

main().catch((e) => { console.error(e); process.exit(1); });
