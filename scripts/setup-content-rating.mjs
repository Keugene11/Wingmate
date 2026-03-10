import { readFileSync } from "fs";
import { createSign } from "crypto";

const SA_PATH = "c:/Users/Daniel/Downloads/voicenote-pro-484818-6d6db67c7fdb.json";
const PACKAGE = "com.wingmate.twa";

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

async function main() {
  const token = await getToken();
  console.log("Authenticated.\n");

  // Create edit
  let res = await fetch(`${BASE}/edits`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: "{}",
  });
  const edit = await res.json();
  console.log(`Edit ID: ${edit.id}`);

  // Submit content rating questionnaire (IARC)
  // The questionnaire answers indicate this is a safe, non-violent app
  console.log("\nSubmitting content rating questionnaire...");
  const contentRatingUrl = `${BASE}/edits/${edit.id}/details`;

  // First, set app details (category, contact info)
  const details = {
    contactEmail: "support@wingmate.app",
    contactWebsite: "https://wingmate.vercel.app",
    defaultLanguage: "en-US",
  };

  res = await fetch(contentRatingUrl, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(details),
  });
  let data = await res.json();
  if (!res.ok) {
    console.log("Details error:", JSON.stringify(data, null, 2));
  } else {
    console.log("  App details set!");
  }

  // Commit
  console.log("\nCommitting edit...");
  res = await fetch(`${BASE}/edits/${edit.id}:commit`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  data = await res.json();
  if (!res.ok) {
    console.log("Commit error:", JSON.stringify(data, null, 2));
  } else {
    console.log(`  Committed! Edit: ${data.id}`);
  }

  console.log("\n=== App details updated ===");
  console.log("Note: Content rating questionnaire and target audience");
  console.log("must be completed in Play Console — no API available for these.");
}

main().catch(e => { console.error(e); process.exit(1); });
