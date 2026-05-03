import { readFileSync } from "fs";
import { createSign, createPrivateKey } from "crypto";

// Credentials from CLAUDE.md
const KEY_ID = "B53WPHJTLN";
const ISSUER_ID = "e30fca41-01fd-4020-9b38-9bbde2b0ed44";
const KEY_PATH = "c:/Users/Daniel/Downloads/AuthKey_B53WPHJTLN.p8";

// Subscription config
const SUBSCRIPTION_ID = "6765975080";
const TARGET_USD = 19.99;

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

// Paginate a JSON:API list endpoint, returning {data: [...], included: [...]}
async function paginate(initialPath, maxPages = 50) {
  const allData = [];
  const allIncluded = [];
  let next = initialPath;
  let pages = 0;
  while (next && pages < maxPages) {
    const res = await api("GET", next);
    if (!res.ok) {
      console.log(`    ERROR paginating ${next}:`, JSON.stringify(res.data, null, 2));
      return { ok: false, data: allData, included: allIncluded, status: res.status, error: res.data };
    }
    for (const d of (res.data.data || [])) allData.push(d);
    for (const i of (res.data.included || [])) allIncluded.push(i);
    next = res.data.links?.next || null;
    pages++;
  }
  return { ok: true, data: allData, included: allIncluded, pages };
}

async function main() {
  // 1. Find USA price point id for $19.99
  console.log(`[1] Finding USA price point for $${TARGET_USD}...`);
  let usaPointId = null;
  let next = `/subscriptions/${SUBSCRIPTION_ID}/pricePoints?filter[territory]=USA&limit=200`;
  let pages = 0;
  while (next && !usaPointId && pages < 10) {
    const pts = await api("GET", next);
    if (!pts.ok) { console.log(`    ERROR pricePoints:`, pts.data); return; }
    for (const p of pts.data.data) {
      if (Number(p.attributes.customerPrice) === TARGET_USD) { usaPointId = p.id; break; }
    }
    next = pts.data.links?.next;
    pages++;
  }
  if (!usaPointId) { console.log(`    ERROR: no $${TARGET_USD} price point in USA`); return; }
  console.log(`    USA price point id: ${usaPointId}`);

  // 2. Fetch equalizations (price points equivalent in every territory)
  console.log(`[2] Fetching equalizations...`);
  const eqRes = await paginate(`/subscriptionPricePoints/${usaPointId}/equalizations?include=territory&limit=200`);
  if (!eqRes.ok) { console.log(`    ERROR fetching equalizations`); return; }
  console.log(`    ${eqRes.data.length} equalization point(s)`);

  // Build territory id lookup. Each point should have relationships.territory.data.id.
  // If missing, fall back to included territory entries by id.
  const territoryByPoint = new Map(); // pointId -> territoryId
  for (const p of eqRes.data) {
    const tid = p.relationships?.territory?.data?.id;
    if (tid) territoryByPoint.set(p.id, tid);
  }
  // Sanity check - if any missing, fetch individually
  const missing = eqRes.data.filter((p) => !territoryByPoint.has(p.id));
  if (missing.length > 0) {
    console.log(`    fetching territory for ${missing.length} point(s) without inline relationship...`);
    for (const p of missing) {
      const r = await api("GET", `/subscriptionPricePoints/${p.id}?include=territory`);
      if (r.ok) {
        const tid = r.data.data?.relationships?.territory?.data?.id;
        if (tid) territoryByPoint.set(p.id, tid);
      }
    }
  }

  // 3. Fetch existing prices to build set of territories already priced
  console.log(`[3] Fetching existing prices...`);
  const existingRes = await paginate(`/subscriptions/${SUBSCRIPTION_ID}/prices?include=territory&limit=200`);
  if (!existingRes.ok) { console.log(`    ERROR fetching existing prices`); return; }
  const pricedTerritories = new Set();
  for (const price of existingRes.data) {
    const tid = price.relationships?.territory?.data?.id;
    if (tid) pricedTerritories.add(tid);
  }
  console.log(`    ${existingRes.data.length} existing price(s) covering ${pricedTerritories.size} territor(ies)`);

  // 4. For each equalization point not yet priced, POST a subscriptionPrice.
  console.log(`[4] Creating prices for missing territories...`);
  let added = 0;
  let skipped = 0;
  let failed = 0;
  const failures = []; // collect a sample for reporting
  // For starting prices on territories that have no baseline yet, Apple requires
  // preserveCurrentPrice=true (counterintuitively — this means "don't roll an existing
  // subscriber to a new price" since there are no existing subscribers in this territory).
  for (const point of eqRes.data) {
    const tid = territoryByPoint.get(point.id);
    if (!tid) { failed++; failures.push({ point: point.id, err: "no territory id" }); continue; }
    if (pricedTerritories.has(tid)) { skipped++; continue; }
    const create = await api("POST", `/subscriptionPrices`, {
      data: {
        type: "subscriptionPrices",
        attributes: { preserveCurrentPrice: true },
        relationships: {
          subscription: { data: { type: "subscriptions", id: SUBSCRIPTION_ID } },
          subscriptionPricePoint: { data: { type: "subscriptionPricePoints", id: point.id } },
          territory: { data: { type: "territories", id: tid } },
        },
      },
    });
    if (create.ok) {
      added++;
    } else {
      failed++;
      if (failures.length < 5) failures.push({ territory: tid, point: point.id, status: create.status, err: create.data?.errors?.[0]?.detail || create.data });
    }
  }
  console.log(`    added: ${added}, skipped: ${skipped}, failed: ${failed}`);
  if (failures.length > 0) {
    console.log(`    sample failures:`);
    for (const f of failures) console.log(`      ${JSON.stringify(f)}`);
  }

  // 5. Attempt resubmission
  console.log(`\n[5] Attempting subscriptionSubmissions for ${SUBSCRIPTION_ID}...`);
  const submit = await api("POST", `/subscriptionSubmissions`, {
    data: {
      type: "subscriptionSubmissions",
      relationships: { subscription: { data: { type: "subscriptions", id: SUBSCRIPTION_ID } } },
    },
  });
  console.log(`    status: ${submit.status}`);
  if (submit.ok) {
    console.log(`    SUCCESS: created submission ${submit.data.data?.id}`);
  } else {
    console.log(`    submission failed:`, JSON.stringify(submit.data, null, 2));
  }

  console.log(`\nSummary:`);
  console.log(`  USA price point: ${usaPointId}`);
  console.log(`  equalization points returned: ${eqRes.data.length}`);
  console.log(`  prices added: ${added}`);
  console.log(`  prices skipped (already set): ${skipped}`);
  console.log(`  prices failed: ${failed}`);
  console.log(`  submission ok: ${submit.ok} (${submit.status})`);
  if (submit.ok) console.log(`  submission id: ${submit.data.data?.id}`);

  console.log(`\nDone.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
