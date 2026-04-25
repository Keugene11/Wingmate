// Upload iPhone 6.7" and iPad 13" screenshots to App Store Connect.
//
// Flow per slot:
//   1. Resolve the latest in-progress App Store version
//   2. Find or create the appScreenshotSet for our (locale, displayType)
//   3. Delete any existing screenshots in that set
//   4. For each PNG: reserve an upload, PUT the bytes, commit with checksum
//
// Prereqs:
//   - screenshots/ios-iphone/*.png   (1290 x 2796 — from Playwright, APP_IPHONE_67)
//   - screenshots/ios-ipad/*.png     (2064 x 2752 — from build-ipad-screenshots.mjs)

import { readFileSync, statSync, existsSync } from "fs";
import { createSign, createHash } from "crypto";
import path from "path";

const KEY_PATH = "C:/Users/Daniel/Downloads/AuthKey_6MXUT35K5X.p8";
const KEY_ID = "6MXUT35K5X";
const ISSUER = "e30fca41-01fd-4020-9b38-9bbde2b0ed44";
const APP_ID = "6761027246";
const LOCALE = "en-US";

const SLOTS = [
  {
    label: "iPhone 6.7\"",
    displayType: "APP_IPHONE_67",
    files: [
      "screenshots/ios-iphone/01_welcome.png",
      "screenshots/ios-iphone/02_today.png",
      "screenshots/ios-iphone/03_plan.png",
      "screenshots/ios-iphone/04_coach.png",
      "screenshots/ios-iphone/05_community.png",
      "screenshots/ios-iphone/06_plans.png",
    ],
  },
  {
    label: "iPad 13\"",
    displayType: "APP_IPAD_PRO_3GEN_129",
    files: [
      "screenshots/ios-ipad/01_welcome.png",
      "screenshots/ios-ipad/02_today.png",
      "screenshots/ios-ipad/03_plan.png",
      "screenshots/ios-ipad/04_coach.png",
      "screenshots/ios-ipad/05_community.png",
      "screenshots/ios-ipad/06_plans.png",
    ],
  },
];

// Cache the JWT — generating a fresh one per request was occasionally
// flaking with NOT_AUTHORIZED on subsequent calls (clock skew or rate).
let cachedJwt = null;
let cachedJwtExp = 0;
function jwt() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedJwt && now < cachedJwtExp - 60) return cachedJwt;
  const exp = now + 1200;
  const header = Buffer.from(JSON.stringify({ alg: "ES256", kid: KEY_ID, typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: ISSUER, iat: now, exp, aud: "appstoreconnect-v1",
  })).toString("base64url");
  const key = readFileSync(KEY_PATH, "utf8");
  const sig = createSign("SHA256")
    .update(header + "." + payload)
    .sign({ key, dsaEncoding: "ieee-p1363" })
    .toString("base64url");
  cachedJwt = header + "." + payload + "." + sig;
  cachedJwtExp = exp;
  return cachedJwt;
}

const BASE = "https://api.appstoreconnect.apple.com/v1";

async function api(method, route, body) {
  const res = await fetch(`${BASE}/${route}`, {
    method,
    headers: {
      Authorization: `Bearer ${jwt()}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${route} → ${res.status}: ${text}`);
  return text ? JSON.parse(text) : {};
}

async function getEditableVersion() {
  // Look for the most recent version that's still editable (not yet released).
  const r = await api(
    "GET",
    `apps/${APP_ID}/appStoreVersions?limit=10&fields[appStoreVersions]=versionString,appStoreState,appVersionState`,
  );
  // Editable states (current API uses appVersionState; older apps may still show appStoreState)
  const editable = r.data.find((v) => {
    const s = v.attributes.appVersionState || v.attributes.appStoreState;
    return [
      "PREPARE_FOR_SUBMISSION",
      "DEVELOPER_REJECTED",
      "REJECTED",
      "METADATA_REJECTED",
      "INVALID_BINARY",
      "WAITING_FOR_REVIEW",
      "IN_REVIEW",
    ].includes(s);
  });
  if (!editable) {
    console.log("Recent versions:", r.data.map((v) => ({
      v: v.attributes.versionString,
      state: v.attributes.appVersionState || v.attributes.appStoreState,
    })));
    throw new Error("No editable version found. Create one in App Store Connect first.");
  }
  console.log(`Editing version ${editable.attributes.versionString} (${editable.attributes.appVersionState || editable.attributes.appStoreState})`);
  return editable.id;
}

async function getLocalization(versionId) {
  const r = await api(
    "GET",
    `appStoreVersions/${versionId}/appStoreVersionLocalizations?limit=50&fields[appStoreVersionLocalizations]=locale`,
  );
  const found = r.data.find((l) => l.attributes.locale === LOCALE);
  if (!found) throw new Error(`No ${LOCALE} localization found for this version.`);
  return found.id;
}

async function getOrCreateScreenshotSet(localizationId, displayType) {
  const r = await api(
    "GET",
    `appStoreVersionLocalizations/${localizationId}/appScreenshotSets?fields[appScreenshotSets]=screenshotDisplayType`,
  );
  const existing = r.data.find((s) => s.attributes.screenshotDisplayType === displayType);
  if (existing) return existing.id;

  const created = await api("POST", "appScreenshotSets", {
    data: {
      type: "appScreenshotSets",
      attributes: { screenshotDisplayType: displayType },
      relationships: {
        appStoreVersionLocalization: { data: { type: "appStoreVersionLocalizations", id: localizationId } },
      },
    },
  });
  return created.data.id;
}

async function deleteExistingScreenshots(setId) {
  const r = await api("GET", `appScreenshotSets/${setId}/appScreenshots?limit=20`);
  for (const s of r.data) {
    await api("DELETE", `appScreenshots/${s.id}`);
  }
  return r.data.length;
}

async function uploadScreenshot(setId, filePath) {
  const buf = readFileSync(filePath);
  const fileName = path.basename(filePath);
  const fileSize = statSync(filePath).size;

  // 1) Reserve the upload — API replies with one or more upload operations
  // (typically a single PUT) and the asset id.
  const reserve = await api("POST", "appScreenshots", {
    data: {
      type: "appScreenshots",
      attributes: { fileName, fileSize },
      relationships: {
        appScreenshotSet: { data: { type: "appScreenshotSets", id: setId } },
      },
    },
  });
  const screenshotId = reserve.data.id;
  const ops = reserve.data.attributes.uploadOperations || [];
  if (ops.length === 0) throw new Error(`No uploadOperations returned for ${fileName}`);

  // 2) Execute each upload op (usually a single PUT covering the full file).
  for (const op of ops) {
    const headers = Object.fromEntries(op.requestHeaders.map((h) => [h.name, h.value]));
    const slice = buf.subarray(op.offset, op.offset + op.length);
    const r = await fetch(op.url, { method: op.method, headers, body: slice });
    if (!r.ok) throw new Error(`Upload op failed ${r.status}: ${await r.text()}`);
  }

  // 3) Commit by PATCHing with uploaded=true and the file's MD5 checksum.
  const checksum = createHash("md5").update(buf).digest("hex");
  await api("PATCH", `appScreenshots/${screenshotId}`, {
    data: {
      type: "appScreenshots",
      id: screenshotId,
      attributes: { uploaded: true, sourceFileChecksum: checksum },
    },
  });

  return screenshotId;
}

async function main() {
  // Pre-flight: every file must exist before we touch the listing.
  for (const slot of SLOTS) {
    for (const f of slot.files) {
      if (!existsSync(f)) {
        const hint = slot.label.startsWith("iPhone")
          ? "Run `pnpm playwright test --project=ios-iphone`."
          : "Run `pnpm playwright test --project=ios-iphone` then `node scripts/build-ipad-screenshots.mjs`.";
        throw new Error(`Missing ${f}. ${hint}`);
      }
    }
  }

  const versionId = await getEditableVersion();
  const localizationId = await getLocalization(versionId);
  console.log(`Locale ${LOCALE} on version ${versionId}\n`);

  for (const slot of SLOTS) {
    console.log(`--- ${slot.label} (${slot.displayType}) ---`);
    const setId = await getOrCreateScreenshotSet(localizationId, slot.displayType);
    const removed = await deleteExistingScreenshots(setId);
    if (removed) console.log(`Removed ${removed} existing screenshot(s)`);
    for (const file of slot.files) {
      const id = await uploadScreenshot(setId, file);
      const kb = (statSync(file).size / 1024).toFixed(0);
      console.log(`  ✓ ${path.basename(file)}  (${kb} KB)  → ${id}`);
    }
    console.log("");
  }

  console.log("=== DONE ===");
  console.log("iPhone 6.7\" + iPad 13\" screenshots replaced on the en-US App Store listing.");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
