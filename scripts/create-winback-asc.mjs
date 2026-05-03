import { readFileSync } from "fs";
import { createSign, createPrivateKey } from "crypto";

// Credentials from CLAUDE.md
const KEY_ID = "B53WPHJTLN";
const ISSUER_ID = "e30fca41-01fd-4020-9b38-9bbde2b0ed44";
const KEY_PATH = "c:/Users/Daniel/Downloads/AuthKey_B53WPHJTLN.p8";
const BUNDLE_ID = "live.wingmate.app";

// New product config
const NEW_PRODUCT_ID = "wingmate_winback_yearly";
const NEW_NAME = "Wingmate Pro Yearly (Win-back)";
const SUBSCRIPTION_PERIOD = "ONE_YEAR";
const TARGET_PRICE_USD = 19.99;
const LOCALE = "en-US";
const LOC_NAME = "Wingmate Pro Yearly";
// Apple cap: 55 chars
const LOC_DESCRIPTION = "Unlimited coaching, tracker, community. Limited offer.";
const REVIEW_NOTE = "Win-back offer shown after paywall cancel";

const API = "https://api.appstoreconnect.apple.com/v1";

const privateKey = createPrivateKey(readFileSync(KEY_PATH, "utf8"));

function createJwt() {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "ES256", kid: KEY_ID, typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: ISSUER_ID,
    iat: now,
    exp: now + 1200,
    aud: "appstoreconnect-v1",
  })).toString("base64url");
  const sign = createSign("SHA256");
  sign.update(`${header}.${payload}`);
  // ES256 JWT requires IEEE P1363 format (raw r||s), not DER
  const sig = sign.sign({ key: privateKey, dsaEncoding: "ieee-p1363" });
  return `${header}.${payload}.${sig.toString("base64url")}`;
}

const token = createJwt();

async function api(method, path, body) {
  const url = path.startsWith("http") ? path : `${API}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data; try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  return { ok: res.ok, status: res.status, data };
}

async function main() {
  // 1. Find app by bundle ID
  console.log(`[1] Looking up app ${BUNDLE_ID}...`);
  const apps = await api("GET", `/apps?filter[bundleId]=${BUNDLE_ID}&limit=5`);
  if (!apps.ok || apps.data.data.length === 0) {
    console.log("    ERROR finding app:", apps.status, apps.data);
    return;
  }
  const appId = apps.data.data[0].id;
  console.log(`    app ID: ${appId}`);

  // 2. Get subscription groups
  console.log(`[2] Fetching subscription groups...`);
  const groups = await api("GET", `/apps/${appId}/subscriptionGroups`);
  if (!groups.ok) { console.log("    ERROR groups:", groups.data); return; }
  console.log(`    ${groups.data.data.length} group(s)`);

  // 3. Find the group containing wingmate_yearly
  let targetGroupId = null;
  let groupSubs = [];
  for (const g of groups.data.data) {
    const gSubs = await api("GET", `/subscriptionGroups/${g.id}/subscriptions?limit=50`);
    if (!gSubs.ok) { console.log(`    ERROR subs for group ${g.id}:`, gSubs.data); continue; }
    const productIds = gSubs.data.data.map((s) => s.attributes.productId);
    console.log(`    group ${g.id}: [${productIds.join(", ")}]`);
    const hasYearly = gSubs.data.data.some((s) =>
      /yearly/i.test(s.attributes.productId)
    );
    if (hasYearly) {
      targetGroupId = g.id;
      groupSubs = gSubs.data.data;
    }
  }
  if (!targetGroupId) {
    console.log(`    ERROR: no group with wingmate_yearly found`);
    return;
  }
  console.log(`    target group: ${targetGroupId}`);

  // 4. Idempotency check
  console.log(`[3] Idempotency check for ${NEW_PRODUCT_ID}...`);
  let sub = groupSubs.find((s) => s.attributes.productId === NEW_PRODUCT_ID);
  if (sub) {
    console.log(`    EXISTS: subscription ${sub.id} (${sub.attributes.name}) — skipping creation`);
  } else {
    // 5. Create subscription
    console.log(`[4] Creating subscription ${NEW_PRODUCT_ID}...`);
    const createSub = await api("POST", `/subscriptions`, {
      data: {
        type: "subscriptions",
        attributes: {
          name: NEW_NAME,
          productId: NEW_PRODUCT_ID,
          subscriptionPeriod: SUBSCRIPTION_PERIOD,
          familySharable: false,
          reviewNote: REVIEW_NOTE,
        },
        relationships: {
          group: { data: { type: "subscriptionGroups", id: targetGroupId } },
        },
      },
    });
    if (!createSub.ok) {
      console.log(`    ERROR creating subscription:`, JSON.stringify(createSub.data, null, 2));
      return;
    }
    sub = createSub.data.data;
    console.log(`    created subscription ${sub.id}`);
  }

  const subId = sub.id;

  // 6. Localization (en-US) — check existing first
  console.log(`[5] Checking ${LOCALE} localization...`);
  const existingLocs = await api("GET", `/subscriptions/${subId}/subscriptionLocalizations?limit=50`);
  let hasLoc = false;
  if (existingLocs.ok) {
    for (const l of existingLocs.data.data) {
      if (l.attributes.locale === LOCALE) {
        hasLoc = true;
        console.log(`    EXISTS: localization ${l.id} (${l.attributes.locale}) — skipping`);
        break;
      }
    }
  }
  if (!hasLoc) {
    const createLoc = await api("POST", `/subscriptionLocalizations`, {
      data: {
        type: "subscriptionLocalizations",
        attributes: {
          name: LOC_NAME,
          description: LOC_DESCRIPTION,
          locale: LOCALE,
        },
        relationships: {
          subscription: { data: { type: "subscriptions", id: subId } },
        },
      },
    });
    if (!createLoc.ok) {
      console.log(`    ERROR creating localization:`, JSON.stringify(createLoc.data, null, 2));
    } else {
      console.log(`    created localization ${createLoc.data.data.id}`);
    }
  }

  // 7. Find USA price point for $19.99
  console.log(`[6] Finding USA price point for $${TARGET_PRICE_USD}...`);
  // Check existing first
  const existingPrices = await api("GET", `/subscriptions/${subId}/prices?filter[territory]=USA&include=subscriptionPricePoint&limit=20`);
  let hasPrice = false;
  if (existingPrices.ok) {
    const pricePoints = (existingPrices.data.included || []).filter((i) => i.type === "subscriptionPricePoints");
    for (const p of pricePoints) {
      if (Number(p.attributes.customerPrice) === TARGET_PRICE_USD) {
        hasPrice = true;
        console.log(`    EXISTS: USA price already at $${TARGET_PRICE_USD} (point ${p.id}) — skipping`);
        break;
      }
    }
  }

  if (!hasPrice) {
    let pointId = null;
    let next = `/subscriptions/${subId}/pricePoints?filter[territory]=USA&limit=200`;
    let pages = 0;
    while (next && !pointId && pages < 10) {
      const pts = await api("GET", next);
      if (!pts.ok) { console.log(`    ERROR pricePoints:`, pts.data); break; }
      for (const p of pts.data.data) {
        if (Number(p.attributes.customerPrice) === TARGET_PRICE_USD) { pointId = p.id; break; }
      }
      next = pts.data.links?.next;
      pages++;
    }
    if (!pointId) {
      console.log(`    ERROR: no price point found for $${TARGET_PRICE_USD} in USA`);
    } else {
      console.log(`    matched USA price point: ${pointId}`);
      console.log(`[7] Creating subscriptionPrice...`);
      // Apple requires startDate >= tomorrow when there's no existing baseline price.
      const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString().split("T")[0];
      const createPrice = await api("POST", `/subscriptionPrices`, {
        data: {
          type: "subscriptionPrices",
          attributes: {
            startDate: tomorrow,
            preserveCurrentPrice: false,
          },
          relationships: {
            subscription: { data: { type: "subscriptions", id: subId } },
            subscriptionPricePoint: { data: { type: "subscriptionPricePoints", id: pointId } },
            territory: { data: { type: "territories", id: "USA" } },
          },
        },
      });
      if (!createPrice.ok) {
        console.log(`    ERROR creating price:`, JSON.stringify(createPrice.data, null, 2));
      } else {
        console.log(`    created subscriptionPrice ${createPrice.data.data.id}`);
      }
    }
  }

  // 8. 3-day free trial intro offer (USA)
  console.log(`[8] Checking existing intro offers...`);
  const existingOffers = await api("GET", `/subscriptions/${subId}/introductoryOffers?limit=50`);
  let hasOffer = false;
  if (existingOffers.ok) {
    for (const o of existingOffers.data.data) {
      const a = o.attributes || {};
      if (a.offerMode === "FREE_TRIAL" && a.duration === "THREE_DAYS") {
        hasOffer = true;
        console.log(`    EXISTS: intro offer ${o.id} (FREE_TRIAL/THREE_DAYS) — skipping`);
        break;
      }
    }
  } else {
    console.log(`    (could not list existing offers: ${existingOffers.status})`);
  }

  if (!hasOffer) {
    console.log(`[9] Creating 3-day FREE_TRIAL intro offer (USA)...`);
    const createOffer = await api("POST", `/subscriptionIntroductoryOffers`, {
      data: {
        type: "subscriptionIntroductoryOffers",
        attributes: {
          offerMode: "FREE_TRIAL",
          duration: "THREE_DAYS",
          numberOfPeriods: 1,
          startDate: null,
          endDate: null,
        },
        relationships: {
          subscription: { data: { type: "subscriptions", id: subId } },
          territory: { data: { type: "territories", id: "USA" } },
        },
      },
    });
    if (!createOffer.ok) {
      console.log(`    ERROR creating intro offer:`, JSON.stringify(createOffer.data, null, 2));
    } else {
      console.log(`    created intro offer ${createOffer.data.data.id}`);
    }
  }

  // 9. Final state report
  console.log(`\n[10] Final state for ${NEW_PRODUCT_ID}:`);
  const finalSub = await api("GET", `/subscriptions/${subId}?include=subscriptionLocalizations,prices,introductoryOffers`);
  if (finalSub.ok) {
    const a = finalSub.data.data.attributes;
    console.log(`    state: ${a.state}`);
    console.log(`    name: ${a.name}`);
    console.log(`    productId: ${a.productId}`);
    console.log(`    period: ${a.subscriptionPeriod}`);
    console.log(`    reviewNote: ${a.reviewNote}`);
    const inc = finalSub.data.included || [];
    console.log(`    included: ${inc.length} related (${inc.map((i) => i.type).join(", ")})`);
  } else {
    console.log(`    ERROR fetching final state:`, finalSub.data);
  }

  console.log(`\nDone.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
