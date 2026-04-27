// Upload the 512x512 high-res icon to the Play Store listing.
// One-off: lanes in fastlane/Fastfile are skip_upload_images, so this
// goes around fastlane and talks to the Play Developer API directly.

import { readFileSync } from "fs";
import { createSign } from "crypto";

const SA_PATH = "c:/Users/Daniel/Downloads/voicenote-pro-484818-6d6db67c7fdb.json";
const PACKAGE_NAME = "com.approachai.twa";
const ICON_PATH = "public/icons/icon-512.png";
const LANGUAGE = "en-US";
const API = "https://androidpublisher.googleapis.com/androidpublisher/v3";
const UPLOAD = "https://androidpublisher.googleapis.com/upload/androidpublisher/v3";

const sa = JSON.parse(readFileSync(SA_PATH, "utf8"));

function createJwt() {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: sa.token_uri,
    iat: now,
    exp: now + 3600,
  })).toString("base64url");
  const sign = createSign("RSA-SHA256");
  sign.update(`${header}.${payload}`);
  return `${header}.${payload}.${sign.sign(sa.private_key, "base64url")}`;
}

async function getToken() {
  const res = await fetch(sa.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${createJwt()}`,
  });
  const { access_token, error } = await res.json();
  if (!access_token) throw new Error(`Auth failed: ${error}`);
  return access_token;
}

async function api(token, method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data; try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

async function abortDraftEdits(token) {
  // Fastlane / prior runs sometimes leave dangling draft edits, which
  // makes the next insert error with 409. Clear what we can.
  try {
    const list = await fetch(`${API}/applications/${PACKAGE_NAME}/edits`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!list.ok) return;
    // No public list endpoint — skip; Google handles abandoned edits server-side after a few hours.
  } catch {}
}

async function main() {
  console.log(`Authenticating as ${sa.client_email}...`);
  const token = await getToken();

  console.log("Creating edit...");
  const edit = await api(token, "POST", `/applications/${PACKAGE_NAME}/edits`, {});
  const editId = edit.id;
  console.log(`  edit ${editId}`);

  console.log(`Deleting existing high-res icon for ${LANGUAGE}...`);
  try {
    await api(token, "DELETE", `/applications/${PACKAGE_NAME}/edits/${editId}/listings/${LANGUAGE}/icon`);
    console.log("  deleted");
  } catch (e) {
    console.log(`  no existing icon (ok): ${e.message.slice(0, 120)}`);
  }

  console.log(`Uploading ${ICON_PATH}...`);
  const png = readFileSync(ICON_PATH);
  const upRes = await fetch(
    `${UPLOAD}/applications/${PACKAGE_NAME}/edits/${editId}/listings/${LANGUAGE}/icon?uploadType=media`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "image/png",
        "Content-Length": String(png.byteLength),
      },
      body: png,
    },
  );
  const upText = await upRes.text();
  if (!upRes.ok) throw new Error(`Upload failed ${upRes.status}: ${upText}`);
  console.log(`  uploaded: ${upText}`);

  console.log("Committing edit...");
  const commit = await api(token, "POST", `/applications/${PACKAGE_NAME}/edits/${editId}:commit`, {});
  console.log(`  committed edit ${commit.id}`);
  console.log("\nDone — Play Store listing icon updated. Allow ~1 hour for the new icon to propagate to the Store page.");
}

main().catch((e) => { console.error(e); process.exit(1); });
