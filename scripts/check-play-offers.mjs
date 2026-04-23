import { readFileSync } from "fs";
import { createSign } from "crypto";

const SA_PATH = "c:/Users/Daniel/Downloads/voicenote-pro-484818-6d6db67c7fdb.json";
const PACKAGE_NAME = "com.approachai.twa";
const API = "https://androidpublisher.googleapis.com/androidpublisher/v3";

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
  return { ok: res.ok, status: res.status, data };
}

const token = await getToken();
for (const productId of ["monthly", "yearly"]) {
  console.log(`\n=== ${productId} ===`);
  const sub = await api(token, "GET", `/applications/${PACKAGE_NAME}/subscriptions/${productId}`);
  if (!sub.ok) { console.log("  ERROR:", sub.status, sub.data); continue; }
  for (const bp of sub.data.basePlans || []) {
    console.log(`  base plan: ${bp.basePlanId} [${bp.state}]`);
    const offers = await api(token, "GET", `/applications/${PACKAGE_NAME}/subscriptions/${productId}/basePlans/${bp.basePlanId}/offers`);
    if (!offers.ok) { console.log("    offers ERROR:", offers.status, offers.data); continue; }
    const list = offers.data.subscriptionOffers || [];
    if (list.length === 0) { console.log("    (no offers)"); continue; }
    for (const off of list) {
      console.log(`    offer: ${off.offerId} [${off.state}]`);
      for (const phase of off.phases || []) {
        console.log(`      phase: duration=${phase.duration} recurrenceMode=${phase.recurrenceMode} free=${JSON.stringify(phase.regionalConfigs?.[0]?.free ?? phase.otherRegionsConfig?.free)}`);
      }
    }
  }
}
