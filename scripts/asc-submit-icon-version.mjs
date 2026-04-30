// Submit an App Store version once a TestFlight build for it is ready.
// Polls for build processing, creates the version record, attaches the build,
// sets "What's New", and submits for review.
//
// Reads the ASC API key from APP_STORE_CONNECT_API_KEY_BASE64/ID/ISSUER_ID.
// Designed to run from .github/workflows/asc-submit-version.yml.

import { createSign, createPrivateKey } from "crypto";

const KEY_ID = process.env.APP_STORE_CONNECT_API_KEY_ID;
const ISSUER = process.env.APP_STORE_CONNECT_API_ISSUER_ID;
const KEY_B64 = process.env.APP_STORE_CONNECT_API_KEY_BASE64;
const APP_ID = "6761027246";
const PLATFORM = "IOS";
const VERSION_STRING = process.env.VERSION_STRING || "1.0.1";
const RELEASE_NOTES = process.env.RELEASE_NOTES || "Updated app icon.";

if (!KEY_ID || !ISSUER || !KEY_B64) {
  throw new Error("Missing APP_STORE_CONNECT_API_KEY_ID / _ISSUER_ID / _BASE64");
}

const privateKey = createPrivateKey(Buffer.from(KEY_B64, "base64").toString("utf8"));

function jwt() {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(
    JSON.stringify({ alg: "ES256", kid: KEY_ID, typ: "JWT" }),
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({ iss: ISSUER, iat: now, exp: now + 1200, aud: "appstoreconnect-v1" }),
  ).toString("base64url");
  const sig = createSign("SHA256")
    .update(`${header}.${payload}`)
    .sign({ key: privateKey, dsaEncoding: "ieee-p1363" })
    .toString("base64url");
  return `${header}.${payload}.${sig}`;
}

const BASE = "https://api.appstoreconnect.apple.com/v1";

async function api(method, route, body) {
  const url = route.startsWith("http") ? route : `${BASE}/${route.replace(/^\//, "")}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${jwt()}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data; try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) {
    console.error(`${method} ${route} → ${res.status}`);
    console.error(JSON.stringify(data, null, 2));
    throw new Error(`API ${res.status}`);
  }
  return data;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function findLatestBuildForTrain() {
  const r = await api(
    "GET",
    `builds?filter[app]=${APP_ID}&sort=-uploadedDate&limit=20&fields[builds]=version,uploadedDate,processingState,expired,preReleaseVersion&include=preReleaseVersion&fields[preReleaseVersions]=version,platform`,
  );
  for (const b of r.data) {
    if (b.attributes.expired) continue;
    const preRel = b.relationships?.preReleaseVersion?.data;
    const pre = preRel ? r.included?.find((i) => i.id === preRel.id) : null;
    const trainVersion = pre?.attributes?.version;
    const trainPlatform = pre?.attributes?.platform;
    console.log(
      `  build ${b.attributes.version} train=${trainVersion} platform=${trainPlatform} state=${b.attributes.processingState} uploaded=${b.attributes.uploadedDate}`,
    );
    if (trainVersion === VERSION_STRING && trainPlatform === PLATFORM) return b;
  }
  return null;
}

async function waitForBuildProcessing(buildId, timeoutMin = 25) {
  const start = Date.now();
  while (Date.now() - start < timeoutMin * 60 * 1000) {
    const r = await api("GET", `builds/${buildId}?fields[builds]=processingState`);
    const state = r.data.attributes.processingState;
    console.log(`  processing: ${state}`);
    if (state === "VALID") return;
    if (state === "FAILED" || state === "INVALID") throw new Error(`Build processing ${state}`);
    await sleep(30_000);
  }
  throw new Error(`Build still processing after ${timeoutMin}min`);
}

async function findOrCreateVersion() {
  const r = await api(
    "GET",
    `apps/${APP_ID}/appStoreVersions?limit=20&filter[platform]=${PLATFORM}&filter[versionString]=${VERSION_STRING}`,
  );
  if (r.data.length > 0) {
    const v = r.data[0];
    console.log(
      `Version ${VERSION_STRING} exists: id=${v.id} state=${v.attributes.appVersionState || v.attributes.appStoreState}`,
    );
    return v;
  }
  console.log(`Creating version ${VERSION_STRING}…`);
  const created = await api("POST", "appStoreVersions", {
    data: {
      type: "appStoreVersions",
      attributes: {
        platform: PLATFORM,
        versionString: VERSION_STRING,
        releaseType: "AFTER_APPROVAL",
      },
      relationships: {
        app: { data: { type: "apps", id: APP_ID } },
      },
    },
  });
  console.log(`✓ Created ${VERSION_STRING}: ${created.data.id}`);
  return created.data;
}

async function setReleaseNotes(versionId) {
  const locs = await api(
    "GET",
    `appStoreVersions/${versionId}/appStoreVersionLocalizations?limit=50`,
  );
  if (locs.data.length === 0) {
    console.log("  no localizations on this version yet (Apple usually clones from previous)");
    return;
  }
  for (const loc of locs.data) {
    const locale = loc.attributes.locale;
    if (loc.attributes.whatsNew === RELEASE_NOTES) {
      console.log(`    ${locale}: already current`);
      continue;
    }
    await api("PATCH", `appStoreVersionLocalizations/${loc.id}`, {
      data: {
        type: "appStoreVersionLocalizations",
        id: loc.id,
        attributes: { whatsNew: RELEASE_NOTES },
      },
    });
    console.log(`    ${locale}: updated`);
  }
}

async function attachBuild(versionId, buildId) {
  await api("PATCH", `appStoreVersions/${versionId}/relationships/build`, {
    data: { type: "builds", id: buildId },
  });
  console.log(`✓ Build attached`);
}

async function submitForReview(versionId) {
  // POST directly — Apple's relationship endpoint returns 404 (not data:null)
  // when no submission exists yet, so we can't reliably precheck.
  try {
    const sub = await api("POST", "appStoreVersionSubmissions", {
      data: {
        type: "appStoreVersionSubmissions",
        relationships: {
          appStoreVersion: { data: { type: "appStoreVersions", id: versionId } },
        },
      },
    });
    console.log(`✓ Submitted for review: ${sub.data.id}`);
    return sub.data.id;
  } catch (e) {
    if (String(e.message).includes("409")) {
      console.log("(already submitted)");
      return null;
    }
    throw e;
  }
}

async function main() {
  console.log(`=== Submit ${VERSION_STRING} ===\n`);

  console.log("Finding latest build for train…");
  const build = await findLatestBuildForTrain();
  if (!build) throw new Error(`No build found for train ${VERSION_STRING}`);
  console.log(`→ build ${build.attributes.version} (id ${build.id})`);

  if (build.attributes.processingState !== "VALID") {
    console.log("\nWaiting for processing…");
    await waitForBuildProcessing(build.id);
  } else {
    console.log("(already VALID)");
  }

  console.log("");
  const version = await findOrCreateVersion();

  console.log("\nRelease notes:");
  await setReleaseNotes(version.id);

  console.log("");
  await attachBuild(version.id, build.id);

  console.log("");
  await submitForReview(version.id);

  console.log("\n✓ Done. Apple review typically 24-48h. The new icon will appear on the App Store once the version is approved + released.");
}

main().catch((e) => {
  console.error("\n✗ Failed:", e.message || e);
  process.exit(1);
});
