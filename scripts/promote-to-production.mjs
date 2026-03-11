import { readFileSync } from "fs";
import { createSign } from "crypto";

const SA_PATH = process.argv[2] || "c:/Users/Daniel/Downloads/voicenote-pro-484818-6d6db67c7fdb.json";
const PACKAGE = process.argv[3] || "com.approachai.twa";

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
  const signature = sign.sign(sa.private_key, "base64url");
  return `${header}.${payload}.${signature}`;
}

async function getToken() {
  const res = await fetch(sa.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${createJwt()}`,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Auth failed: " + JSON.stringify(data));
  return data.access_token;
}

const BASE = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE}`;

async function api(token, method, path, body) {
  const url = `${BASE}/${path}`;
  const headers = { Authorization: `Bearer ${token}` };
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(url, { method, headers, body: body || undefined });
  const text = await res.text();
  if (!res.ok) throw new Error(`API ${res.status} ${path}: ${text}`);
  return text ? JSON.parse(text) : {};
}

async function main() {
  const token = await getToken();
  console.log("Authenticated.\n");

  // Create edit
  const edit = await api(token, "POST", "edits", "{}");
  console.log(`Edit ID: ${edit.id}`);

  // Get current internal track
  console.log("\nFetching internal track...");
  const track = await api(token, "GET", `edits/${edit.id}/tracks/internal`);
  console.log("Internal track:", JSON.stringify(track, null, 2));

  if (!track.releases || track.releases.length === 0) {
    console.log("No releases found on internal track.");
    return;
  }

  // Get the latest version code from internal
  const latestRelease = track.releases[0];
  const versionCodes = latestRelease.versionCodes;
  console.log(`\nLatest version codes: ${versionCodes}`);

  // Promote to production
  console.log("\nPromoting to production...");
  const prodTrack = {
    track: "production",
    releases: [{
      versionCodes: versionCodes,
      status: "completed",
      releaseNotes: [{
        language: "en-US",
        text: "Initial release of Wingmate - your AI cold approach confidence coach."
      }]
    }]
  };

  await api(token, "PUT", `edits/${edit.id}/tracks/production`, JSON.stringify(prodTrack));
  console.log("  Set production track!");

  // Commit
  console.log("\nCommitting edit...");
  const commit = await api(token, "POST", `edits/${edit.id}:commit`);
  console.log(`  Committed! Edit: ${commit.id}`);

  console.log("\n=== APP PROMOTED TO PRODUCTION ===");
  console.log("The app will go through Google's review process.");
  console.log("This typically takes a few hours to a few days.");
}

main().catch(e => { console.error(e); process.exit(1); });
