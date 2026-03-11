import { readFileSync } from "fs";
import { createSign } from "crypto";

const SERVICE_ACCOUNT_JSON = process.argv[2] || "c:/Users/Daniel/Downloads/voicenote-pro-484818-6d6db67c7fdb.json";
const AAB_PATH = process.argv[3] || "C:/Users/Daniel/Downloads/wingmate-android/wingmate-android-v1.0.12/bundle/release/app-release.aab";
const PACKAGE_NAME = process.argv[4] || "com.approachai.twa";

const sa = JSON.parse(readFileSync(SERVICE_ACCOUNT_JSON, "utf8"));

// Step 1: Create JWT and exchange for access token
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

async function getAccessToken() {
  const jwt = createJwt();
  const res = await fetch(sa.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  if (!data.access_token) {
    console.error("Failed to get access token:", data);
    process.exit(1);
  }
  console.log("Got access token");
  return data.access_token;
}

async function api(token, method, path, body, contentType) {
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/${path}`;
  const headers = { Authorization: `Bearer ${token}` };
  if (contentType) headers["Content-Type"] = contentType;

  console.log(`${method} ${path}`);
  const res = await fetch(url, { method, headers, body });
  const text = await res.text();

  if (!res.ok) {
    console.error(`API error ${res.status}:`, text);
    process.exit(1);
  }
  return JSON.parse(text);
}

async function uploadAab(token, editId) {
  const url = `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${PACKAGE_NAME}/edits/${editId}/bundles?uploadType=media`;
  const aabData = readFileSync(AAB_PATH);
  console.log(`Uploading AAB (${(aabData.length / 1024 / 1024).toFixed(1)} MB)...`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
    },
    body: aabData,
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`Upload error ${res.status}:`, text);
    process.exit(1);
  }
  return JSON.parse(text);
}

async function main() {
  console.log(`Package: ${PACKAGE_NAME}`);
  console.log(`AAB: ${AAB_PATH}`);

  const token = await getAccessToken();

  // Step 2: Create an edit
  const edit = await api(token, "POST", "edits", "{}", "application/json");
  console.log(`Created edit: ${edit.id}`);

  // Step 3: Upload the AAB
  const bundle = await uploadAab(token, edit.id);
  console.log(`Uploaded bundle: versionCode=${bundle.versionCode}`);

  // Step 4: Assign to internal track
  const trackBody = JSON.stringify({
    track: "internal",
    releases: [{
      versionCodes: [String(bundle.versionCode)],
      status: "completed",
    }],
  });
  const track = await api(token, "PUT", `edits/${edit.id}/tracks/internal`, trackBody, "application/json");
  console.log(`Assigned to internal track:`, track);

  // Step 5: Commit the edit
  const commit = await api(token, "POST", `edits/${edit.id}:commit`, null);
  console.log(`Committed edit: ${commit.id}`);
  console.log("\nDone! AAB uploaded to Google Play internal testing.");
}

main().catch(e => { console.error(e); process.exit(1); });
