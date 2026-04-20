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
  const signature = sign.sign(sa.private_key, "base64url");
  return `${header}.${payload}.${signature}`;
}

async function getAccessToken() {
  const res = await fetch(sa.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${createJwt()}`,
  });
  const { access_token, error, error_description } = await res.json();
  if (!access_token) throw new Error(`Auth failed: ${error} ${error_description}`);
  return access_token;
}

async function api(token, method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  return { ok: res.ok, status: res.status, data };
}

function basePlanPayload(basePlanId, billingPeriod, priceUnits) {
  return {
    basePlanId,
    state: "DRAFT",
    autoRenewingBasePlanType: {
      billingPeriodDuration: billingPeriod,
      legacyCompatible: true,
      resubscribeState: "RESUBSCRIBE_STATE_ACTIVE",
    },
    regionalConfigs: [{
      regionCode: "US",
      newSubscriberAvailability: true,
      price: { currencyCode: "USD", units: String(priceUnits), nanos: 0 },
    }],
    otherRegionsConfig: {
      usdPrice: { currencyCode: "USD", units: String(priceUnits), nanos: 0 },
      eurPrice: { currencyCode: "EUR", units: String(priceUnits), nanos: 0 },
      newSubscriberAvailability: true,
    },
  };
}

async function ensureSubscription(token, { productId, title, description, basePlanId, billingPeriod, priceUnits }) {
  console.log(`\n=== ${productId} ===`);

  // 1. Check if subscription already exists
  const get = await api(token, "GET", `/applications/${PACKAGE_NAME}/subscriptions/${productId}`);
  if (get.ok) {
    console.log(`  Subscription already exists`);
    const existingPlan = get.data?.basePlans?.find((p) => p.basePlanId === basePlanId);
    if (existingPlan?.state === "ACTIVE") { console.log(`  Base plan already active`); return true; }
  } else if (get.status === 404) {
    console.log(`  Creating subscription with inline base plan...`);
    const create = await api(token, "POST", `/applications/${PACKAGE_NAME}/subscriptions?productId=${productId}&regionsVersion.version=2022/02`, {
      packageName: PACKAGE_NAME,
      productId,
      listings: [{ languageCode: "en-US", title, description }],
      basePlans: [basePlanPayload(basePlanId, billingPeriod, priceUnits)],
      taxAndComplianceSettings: { eeaWithdrawalRightType: "WITHDRAWAL_RIGHT_SERVICE" },
    });
    if (!create.ok) {
      console.log(`  ERROR creating subscription:`, JSON.stringify(create.data, null, 2));
      return false;
    }
    console.log(`  Created subscription OK`);
  } else {
    console.log(`  ERROR checking subscription: ${get.status}`, JSON.stringify(get.data, null, 2));
    return false;
  }

  // 2. Activate base plan
  console.log(`  Activating base plan ${basePlanId}...`);
  const activate = await api(
    token,
    "POST",
    `/applications/${PACKAGE_NAME}/subscriptions/${productId}/basePlans/${basePlanId}:activate`,
    { latencyTolerance: "PRODUCT_UPDATE_LATENCY_TOLERANCE_LATENCY_TOLERANT" }
  );
  if (!activate.ok) {
    console.log(`  ERROR activating:`, JSON.stringify(activate.data, null, 2));
    return false;
  }
  console.log(`  Activated OK`);
  return true;
}

async function main() {
  console.log(`Authenticating as ${sa.client_email}...`);
  const token = await getAccessToken();
  console.log(`Got access token`);

  const monthlyOK = await ensureSubscription(token, {
    productId: "monthly",
    title: "Wingmate Pro Monthly",
    description: "Unlimited AI coaching, community access, and the full approach tracker.",
    basePlanId: "monthly-autorenewing",
    billingPeriod: "P1M",
    priceUnits: 10,
  });

  const yearlyOK = await ensureSubscription(token, {
    productId: "yearly",
    title: "Wingmate Pro Yearly",
    description: "Unlimited AI coaching, community access, and the full approach tracker. Save compared to monthly.",
    basePlanId: "yearly-autorenewing",
    billingPeriod: "P1Y",
    priceUnits: 50,
  });

  console.log(`\n=== Summary ===`);
  console.log(`monthly: ${monthlyOK ? "OK" : "FAILED"}`);
  console.log(`yearly: ${yearlyOK ? "OK" : "FAILED"}`);
}

main().catch((e) => { console.error("Script error:", e); process.exit(1); });
