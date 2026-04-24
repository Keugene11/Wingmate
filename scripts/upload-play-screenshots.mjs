// Replace the Play Store phone screenshots with the real ones captured by
// Playwright (see tests/android-phone-screenshots.spec.ts).
//
// Flow: JWT auth → create edit → delete existing phone screenshots → upload
// new PNGs → commit. Listing text and feature graphic are left untouched.
//
// Prereq: screenshots/android-phone/*.png exists.

import { readFileSync } from "fs";
import { createSign } from "crypto";
import path from "path";

const SA_PATH = "c:/Users/Daniel/Downloads/voicenote-pro-484818-6d6db67c7fdb.json";
const PACKAGE = "com.approachai.twa";
const LANGUAGE = "en-US";

// Play Store allows up to 8 phone screenshots. Ordered list = order shown.
const SHOTS = [
  "screenshots/android-phone/01_welcome.png",
  "screenshots/android-phone/04_pitch.png",
  "screenshots/android-phone/05_goal.png",
  "screenshots/android-phone/06_target.png",
  "screenshots/android-phone/07_doable.png",
  "screenshots/android-phone/08_blockers.png",
  "screenshots/android-phone/03_approaches.png",
  "screenshots/android-phone/10_plans.png",
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

async function uploadPng(token, editId, buffer) {
  const url = `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${PACKAGE}/edits/${editId}/listings/${LANGUAGE}/phoneScreenshots?uploadType=media`;
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

  console.log("Creating edit...");
  const edit = await api(token, "POST", "edits", "{}");
  const editId = edit.id;
  console.log(`Edit: ${editId}\n`);

  console.log("Deleting existing phone screenshots...");
  await api(token, "DELETE", `edits/${editId}/listings/${LANGUAGE}/phoneScreenshots`);
  console.log("OK\n");

  console.log(`Uploading ${SHOTS.length} screenshots...`);
  for (const file of SHOTS) {
    const buf = readFileSync(file);
    await uploadPng(token, editId, buf);
    console.log(`  ✓ ${path.basename(file)}  (${(buf.length / 1024).toFixed(0)} KB)`);
  }

  console.log("\nCommitting edit...");
  const commit = await api(token, "POST", `edits/${editId}:commit`);
  console.log(`Committed edit ${commit.id}`);

  console.log("\n=== DONE ===");
  console.log("Screenshots replaced on the en-US Play Store listing.");
  console.log("Play Console may take a few minutes to reflect the change.");
}

main().catch((e) => { console.error(e); process.exit(1); });
