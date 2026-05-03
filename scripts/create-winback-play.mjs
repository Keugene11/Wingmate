import { readFileSync } from "fs";
import { createSign } from "crypto";

const SA_PATH = "c:/Users/Daniel/Downloads/voicenote-pro-484818-6d6db67c7fdb.json";
const PACKAGE_NAME = "com.approachai.twa";
const API = "https://androidpublisher.googleapis.com/androidpublisher/v3";

const PRODUCT_ID = "wingmate_winback_yearly";
const BASE_PLAN_ID = "yearly-autorenewing";
const OFFER_ID = "winback-trial";
const PRICE_UNITS = "19";
const PRICE_NANOS = 990000000;

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

function buildBasePlan(state = "DRAFT") {
  return {
    basePlanId: BASE_PLAN_ID,
    state,
    autoRenewingBasePlanType: {
      billingPeriodDuration: "P1Y",
      legacyCompatible: false,
      prorationMode: "SUBSCRIPTION_PRORATION_MODE_CHARGE_ON_NEXT_BILLING_DATE",
      resubscribeState: "RESUBSCRIBE_STATE_ACTIVE",
      accountHoldDuration: "P30D",
    },
    regionalConfigs: [{
      regionCode: "US",
      newSubscriberAvailability: true,
      price: { currencyCode: "USD", units: PRICE_UNITS, nanos: PRICE_NANOS },
    }],
    otherRegionsConfig: {
      newSubscriberAvailability: true,
      usdPrice: { currencyCode: "USD", units: PRICE_UNITS, nanos: PRICE_NANOS },
      eurPrice: { currencyCode: "EUR", units: "18", nanos: 990000000 },
    },
  };
}

async function ensureSubscriptionWithBasePlan(token) {
  console.log(`\n=== Steps 2+4: ensure subscription ${PRODUCT_ID} with base plan ${BASE_PLAN_ID} ===`);
  const existing = await api(token, "GET", `/applications/${PACKAGE_NAME}/subscriptions/${PRODUCT_ID}`);

  if (existing.ok) {
    console.log(`  subscription exists. Checking base plan...`);
    const bp = existing.data.basePlans?.find((p) => p.basePlanId === BASE_PLAN_ID);
    if (bp) {
      console.log(`  base plan exists, state=${bp.state}, US price=${bp.regionalConfigs?.find(r => r.regionCode === "US")?.price?.units}.${String(bp.regionalConfigs?.find(r => r.regionCode === "US")?.price?.nanos ?? 0).padStart(9, "0").slice(0,2)}`);
      return { exists: true, state: bp.state };
    }
    // Subscription exists but no base plan: PATCH to add it
    console.log(`  base plan missing, PATCHing subscription with base plan...`);
    const patchBody = {
      ...existing.data,
      basePlans: [...(existing.data.basePlans || []), buildBasePlan("DRAFT")],
    };
    const patch = await api(token, "PATCH", `/applications/${PACKAGE_NAME}/subscriptions/${PRODUCT_ID}?updateMask=basePlans&regionsVersion.version=2022/02`, patchBody);
    if (!patch.ok) {
      console.log(`  ERROR ${patch.status}:`, JSON.stringify(patch.data, null, 2));
      return { exists: false };
    }
    console.log(`  base plan added`);
    return { exists: true, state: "DRAFT" };
  }

  console.log(`  GET returned ${existing.status}, creating subscription via POST with embedded base plan...`);
  const body = {
    packageName: PACKAGE_NAME,
    productId: PRODUCT_ID,
    listings: [{
      languageCode: "en-US",
      title: "Wingmate Pro Yearly (Win-back)",
      benefits: ["Unlimited AI coaching", "Approach tracker", "Community access"],
      description: "One-time discounted yearly offer.",
    }],
    taxAndComplianceSettings: { isTokenizedDigitalAsset: false },
    basePlans: [buildBasePlan("DRAFT")],
  };
  const res = await api(token, "POST", `/applications/${PACKAGE_NAME}/subscriptions?productId=${PRODUCT_ID}&regionsVersion.version=2022/02`, body);
  if (!res.ok) {
    console.log(`  ERROR ${res.status}:`, JSON.stringify(res.data, null, 2));
    return { exists: false };
  }
  console.log(`  created subscription + base plan OK at $${PRICE_UNITS}.${String(PRICE_NANOS).padStart(9, "0").slice(0,2)} USD`);
  return { exists: true, state: "DRAFT" };
}

async function step5_activateBasePlan(token) {
  console.log(`\n=== Step 5: activate base plan ===`);
  const res = await api(token, "POST", `/applications/${PACKAGE_NAME}/subscriptions/${PRODUCT_ID}/basePlans/${BASE_PLAN_ID}:activate`, {
    latencyTolerance: "PRODUCT_UPDATE_LATENCY_TOLERANCE_LATENCY_TOLERANT",
  });
  if (!res.ok) {
    console.log(`  ERROR ${res.status}:`, JSON.stringify(res.data, null, 2));
    return false;
  }
  console.log(`  base plan activated, state=${res.data.state}`);
  return true;
}

async function step6_offer(token) {
  console.log(`\n=== Step 6: create/upsert free-trial offer ${OFFER_ID} ===`);
  // Check if offer exists
  const existing = await api(token, "GET", `/applications/${PACKAGE_NAME}/subscriptions/${PRODUCT_ID}/basePlans/${BASE_PLAN_ID}/offers/${OFFER_ID}`);

  const body = {
    packageName: PACKAGE_NAME,
    productId: PRODUCT_ID,
    basePlanId: BASE_PLAN_ID,
    offerId: OFFER_ID,
    state: "DRAFT",
    phases: [{
      recurrenceCount: 1,
      duration: "P3D",
      regionalConfigs: [{ regionCode: "US", free: {} }],
      otherRegionsConfig: { free: {} },
    }],
    regionalConfigs: [{ regionCode: "US", newSubscriberAvailability: true }],
    otherRegionsConfig: { otherRegionsNewSubscriberAvailability: true },
    offerTags: [{ tag: "winback" }],
  };

  if (existing.ok) {
    console.log(`  offer exists, state=${existing.data.state}, PATCHing...`);
    const patchPath = `/applications/${PACKAGE_NAME}/subscriptions/${PRODUCT_ID}/basePlans/${BASE_PLAN_ID}/offers/${OFFER_ID}?updateMask=phases,offerTags,regionalConfigs,otherRegionsConfig&regionsVersion.version=2022/02`;
    const patch = await api(token, "PATCH", patchPath, body);
    if (!patch.ok) {
      console.log(`  ERROR ${patch.status}:`, JSON.stringify(patch.data, null, 2));
      return false;
    }
    console.log(`  offer updated, state=${patch.data.state}`);
    return true;
  }

  console.log(`  offer missing (status ${existing.status}), creating via POST...`);
  const createPath = `/applications/${PACKAGE_NAME}/subscriptions/${PRODUCT_ID}/basePlans/${BASE_PLAN_ID}/offers?offerId=${OFFER_ID}&regionsVersion.version=2022/02`;
  const res = await api(token, "POST", createPath, body);
  if (!res.ok) {
    console.log(`  ERROR ${res.status}:`, JSON.stringify(res.data, null, 2));
    return false;
  }
  console.log(`  offer created, state=${res.data.state}`);
  return true;
}

async function step7_activateOffer(token) {
  console.log(`\n=== Step 7: activate free-trial offer ===`);
  const res = await api(token, "POST", `/applications/${PACKAGE_NAME}/subscriptions/${PRODUCT_ID}/basePlans/${BASE_PLAN_ID}/offers/${OFFER_ID}:activate`, {
    latencyTolerance: "PRODUCT_UPDATE_LATENCY_TOLERANCE_LATENCY_TOLERANT",
  });
  if (!res.ok) {
    console.log(`  ERROR ${res.status}:`, JSON.stringify(res.data, null, 2));
    return false;
  }
  console.log(`  offer activated, state=${res.data.state}`);
  return true;
}

async function main() {
  console.log(`Authenticating as ${sa.client_email}...`);
  const token = await getToken();
  console.log(`Auth OK. Package: ${PACKAGE_NAME}, Product: ${PRODUCT_ID}`);

  const sub = await ensureSubscriptionWithBasePlan(token);
  if (sub.state !== "ACTIVE") await step5_activateBasePlan(token);
  else console.log(`\n=== Step 5: base plan already ACTIVE, skipping ===`);
  await step6_offer(token);
  await step7_activateOffer(token);

  console.log(`\n=== DONE ===`);
}

main().catch((e) => { console.error(e); process.exit(1); });
