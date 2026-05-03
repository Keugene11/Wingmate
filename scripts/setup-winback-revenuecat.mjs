// Sets up the "winback" offering in RevenueCat with the wingmate_winback_yearly
// product on both Apple + Play apps, and a $rc_annual package attaching both
// product records.
//
// Idempotent — safe to re-run.
//
//   pnpm exec node --env-file=.env.local scripts/setup-winback-revenuecat.mjs

const API_BASE = "https://api.revenuecat.com/v2";
const API_KEY = process.env.REVENUECAT_SECRET_API_KEY;
const PROJECT_ID = "proj4cf8001f";

if (!API_KEY) {
  throw new Error("REVENUECAT_SECRET_API_KEY missing from env (.env.local)");
}

const STORE_PRODUCT_ID = "wingmate_winback_yearly";
// Google Play requires store_identifier in the form `subscriptionId:basePlanId`
const PLAY_BASE_PLAN_ID = "yearly-autorenewing";
const PLAY_STORE_PRODUCT_ID = `${STORE_PRODUCT_ID}:${PLAY_BASE_PLAN_ID}`;
const OFFERING_LOOKUP = "winback";
const OFFERING_DISPLAY = "Win-back offer";
const PACKAGE_LOOKUP = "$rc_annual";
const PACKAGE_DISPLAY = "Annual";

async function rc(method, path, body) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`RC ${method} ${path} → ${res.status}: ${text}`);
  }
  return json;
}

async function paginate(path) {
  // RC v2 uses ?starting_after= for pagination, items in `items` field.
  const all = [];
  let cursor;
  for (let i = 0; i < 50; i++) {
    const sep = path.includes("?") ? "&" : "?";
    const url = cursor ? `${path}${sep}starting_after=${encodeURIComponent(cursor)}` : path;
    const page = await rc("GET", url);
    const items = Array.isArray(page.items) ? page.items : [];
    all.push(...items);
    if (!page.next_page && !page.has_more) break;
    cursor = items.length ? items[items.length - 1].id : null;
    if (!cursor) break;
  }
  return all;
}

// 1. Find apps
console.log("→ Fetching apps…");
const apps = await paginate(`/projects/${PROJECT_ID}/apps`);
for (const a of apps) {
  console.log(`  • ${a.id} — ${a.name} (${a.type})`);
}

const appleApp = apps.find((a) => a.type === "app_store" || a.type === "apple_app_store");
const playApp = apps.find((a) => a.type === "play_store" || a.type === "google_play_store" || a.type === "amazon_app_store" || a.type === "play");

// Be more flexible — RC may use slightly different type strings
const apple = appleApp || apps.find((a) => /apple|ios|app_store/i.test(a.type) && !/test/i.test(a.name || ""));
const play = playApp || apps.find((a) => /play|android|google/i.test(a.type));

if (!apple) throw new Error("No Apple App Store app found");
if (!play) {
  console.warn("WARNING: No Play Store app found in project — Android product will be skipped");
}

console.log(`Apple app: ${apple.id} (${apple.name})`);
if (play) console.log(`Play app:  ${play.id} (${play.name})`);

// 2. Find or create products
console.log("\n→ Fetching existing products…");
const products = await paginate(`/projects/${PROJECT_ID}/products`);
console.log(`  Found ${products.length} existing products`);

function productAppId(p) {
  return p.app?.id ?? p.app_id ?? (typeof p.app === "string" ? p.app : undefined);
}

async function ensureProduct(appObj, storeIdentifier) {
  const existing = products.find(
    (p) => p.store_identifier === storeIdentifier && productAppId(p) === appObj.id,
  );
  if (existing) {
    console.log(`  ✓ Product exists for ${appObj.name} (${storeIdentifier}): ${existing.id}`);
    return existing;
  }
  console.log(`  + Creating product for ${appObj.name} (${storeIdentifier})…`);
  const created = await rc("POST", `/projects/${PROJECT_ID}/products`, {
    store_identifier: storeIdentifier,
    app_id: appObj.id,
    type: "subscription",
    display_name: "Wingmate Pro Yearly (Win-back)",
  });
  console.log(`  ✓ Created product ${created.id} for ${appObj.name}`);
  return created;
}

const appleProduct = await ensureProduct(apple, STORE_PRODUCT_ID);
const playProduct = play ? await ensureProduct(play, PLAY_STORE_PRODUCT_ID) : null;

// 3. Find or create offering
console.log("\n→ Fetching offerings…");
const offerings = await paginate(`/projects/${PROJECT_ID}/offerings`);
let offering = offerings.find((o) => o.lookup_key === OFFERING_LOOKUP);
if (offering) {
  console.log(`  ✓ Offering exists: ${offering.id} (${offering.lookup_key})`);
} else {
  console.log(`  + Creating offering "${OFFERING_LOOKUP}"…`);
  offering = await rc("POST", `/projects/${PROJECT_ID}/offerings`, {
    lookup_key: OFFERING_LOOKUP,
    display_name: OFFERING_DISPLAY,
    metadata: {},
  });
  console.log(`  ✓ Created offering ${offering.id}`);
}

// 4. Find or create package
console.log("\n→ Fetching packages on offering…");
const packages = await paginate(`/projects/${PROJECT_ID}/offerings/${offering.id}/packages`);
let pkg = packages.find((p) => p.lookup_key === PACKAGE_LOOKUP);
if (pkg) {
  console.log(`  ✓ Package exists: ${pkg.id} (${pkg.lookup_key})`);
} else {
  console.log(`  + Creating package "${PACKAGE_LOOKUP}"…`);
  pkg = await rc("POST", `/projects/${PROJECT_ID}/offerings/${offering.id}/packages`, {
    lookup_key: PACKAGE_LOOKUP,
    display_name: PACKAGE_DISPLAY,
    position: 1,
  });
  console.log(`  ✓ Created package ${pkg.id}`);
}

// 5. Attach products to package
// NOTE: package endpoints live under /projects/{pid}/packages/{pkg_id}/...
// (NOT under /offerings/{oid}/packages/...). The offering-scoped path only
// supports list+create.
console.log("\n→ Fetching products attached to package…");
let attached = [];
try {
  attached = await paginate(`/projects/${PROJECT_ID}/packages/${pkg.id}/products`);
} catch (err) {
  console.log(`  (couldn't list: ${err.message})`);
}
console.log(`  Currently ${attached.length} attached`);

function attachedProductId(a) {
  return a.product?.id ?? a.product_id ?? a.id;
}

const desiredProducts = [
  { obj: appleProduct, label: "Apple" },
  ...(playProduct ? [{ obj: playProduct, label: "Play" }] : []),
];

const toAttach = desiredProducts.filter(
  (d) => !attached.some((a) => attachedProductId(a) === d.obj.id),
);

if (toAttach.length === 0) {
  console.log(`  ✓ All desired products already attached`);
} else {
  console.log(`  + Attaching ${toAttach.map((d) => `${d.label}(${d.obj.id})`).join(", ")}…`);
  await rc(
    "POST",
    `/projects/${PROJECT_ID}/packages/${pkg.id}/actions/attach_products`,
    {
      products: toAttach.map((d) => ({
        product_id: d.obj.id,
        eligibility_criteria: "all",
      })),
    },
  );
  console.log(`  ✓ Attached ${toAttach.length} product(s)`);
}

console.log("\n=== Summary ===");
console.log(`Apple app:    ${apple.id}`);
if (play) console.log(`Play app:     ${play.id}`);
console.log(`Apple product: ${appleProduct.id}`);
if (playProduct) console.log(`Play product:  ${playProduct.id}`);
console.log(`Offering:     ${offering.id} (${offering.lookup_key})`);
console.log(`Package:      ${pkg.id} (${pkg.lookup_key})`);
console.log("Done.");
