import { readFileSync } from "fs";
import { createSign } from "crypto";

const sa = JSON.parse(readFileSync("c:/Users/Daniel/Downloads/voicenote-pro-484818-6d6db67c7fdb.json", "utf8"));

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

async function main() {
  const jwt = createJwt();
  const tokenRes = await fetch(sa.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const { access_token } = await tokenRes.json();
  console.log("Got access token");

  // Try a few possible package names
  const guesses = [
    "com.approachai.twa",
    "com.wingmate.app",
    "com.wingmate",
    "com.approachai.twa",
    "com.wingmate.app",
    "com.voicenote.pro",
  ];

  for (const pkg of guesses) {
    const res = await fetch(
      `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${pkg}/edits`,
      { method: "POST", headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" }, body: "{}" }
    );
    const data = await res.json();
    if (res.ok) {
      console.log(`FOUND: ${pkg} — edit id: ${data.id}`);
      // Clean up - delete the edit
      await fetch(
        `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${pkg}/edits/${data.id}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${access_token}` } }
      );
    } else {
      console.log(`${pkg}: ${data.error?.message || "unknown error"}`);
    }
  }
}

main().catch(console.error);
