// Add a 3-day free trial offer to the Google Play monthly + yearly
// subscription base plans. Creates the offer in DRAFT state, then activates.

import { readFileSync } from "fs";
import { createSign } from "crypto";

const SA_PATH = "c:/Users/Daniel/Downloads/voicenote-pro-484818-6d6db67c7fdb.json";
const PACKAGE_NAME = "com.approachai.twa";
const API = "https://androidpublisher.googleapis.com/androidpublisher/v3";
const OFFER_ID = "free-trial-3d";

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

async function run() {
  const token = await getToken();

  for (const { productId, basePlanId } of [
    { productId: "monthly", basePlanId: "monthly-autorenewing" },
    { productId: "yearly",  basePlanId: "yearly-autorenewing" },
  ]) {
    console.log(`\n=== ${productId} / ${basePlanId} ===`);

    // Pull regions from the base plan to build a matching list.
    const sub = await api(token, "GET", `/applications/${PACKAGE_NAME}/subscriptions/${productId}`);
    if (!sub.ok) { console.log("  fetch ERROR", sub.status, sub.data); continue; }
    const bp = sub.data.basePlans?.find((p) => p.basePlanId === basePlanId);
    if (!bp) { console.log("  base plan not found"); continue; }
    // For the offer, include ALL base plan regions (including non-billable
    // like MN) since Google inferes them. free:{} overrides work for
    // non-billable regions too.
    const regionCodes = (bp.regionalConfigs || []).map((r) => r.regionCode);
    console.log(`  ${regionCodes.length} regions: ${regionCodes.join(",")}`);
    console.log(`  full BP regions: ${(bp.regionalConfigs || []).map((r) => r.regionCode).join(",")}`);
    console.log(`  BP otherRegionsConfig: ${JSON.stringify(bp.otherRegionsConfig || null)}`);

    const offerBody = {
      packageName: PACKAGE_NAME,
      productId,
      basePlanId,
      offerId: OFFER_ID,
      state: "DRAFT",
      phases: [
        {
          duration: "P3D",
          recurrenceCount: 1,
          regionalConfigs: regionCodes.map((regionCode) => ({ regionCode, free: {} })),
          otherRegionsConfig: { free: {} },
        },
      ],
      regionalConfigs: regionCodes.map((regionCode) => ({ regionCode, newSubscriberAvailability: true })),
      otherRegionsConfig: { otherRegionsNewSubscriberAvailability: true },
      targeting: {
        acquisitionRule: {
          scope: { anySubscriptionInApp: {} },
        },
      },
    };

    console.log("  payload:", JSON.stringify(offerBody));

    // Create or update. Try create first; if exists (409), fall back to patch.
    const versionQuery = "regionsVersion.version=2025%2F03";
    let createRes = await api(
      token,
      "POST",
      `/applications/${PACKAGE_NAME}/subscriptions/${productId}/basePlans/${basePlanId}/offers?offerId=${OFFER_ID}&${versionQuery}`,
      offerBody
    );
    if (!createRes.ok) {
      console.log(`  create ${createRes.status}`, JSON.stringify(createRes.data).slice(0, 400));
      if (createRes.status === 409 || /already exists/i.test(JSON.stringify(createRes.data))) {
        console.log("  offer exists; patching…");
        const patchRes = await api(
          token,
          "PATCH",
          `/applications/${PACKAGE_NAME}/subscriptions/${productId}/basePlans/${basePlanId}/offers/${OFFER_ID}?updateMask=phases,targeting&${versionQuery}`,
          offerBody
        );
        if (!patchRes.ok) { console.log(`  patch ${patchRes.status}`, patchRes.data); continue; }
        console.log("  patched");
      } else {
        continue;
      }
    } else {
      console.log("  created");
    }

    // Activate
    const actRes = await api(
      token,
      "POST",
      `/applications/${PACKAGE_NAME}/subscriptions/${productId}/basePlans/${basePlanId}/offers/${OFFER_ID}:activate`,
      {}
    );
    if (!actRes.ok) {
      console.log(`  activate ${actRes.status}`, actRes.data);
    } else {
      console.log(`  ACTIVE ✓`);
    }
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
