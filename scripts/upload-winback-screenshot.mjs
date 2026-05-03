import { readFileSync } from "fs";
import { createSign, createPrivateKey, createHash } from "crypto";

// Credentials from CLAUDE.md
const KEY_ID = "B53WPHJTLN";
const ISSUER_ID = "e30fca41-01fd-4020-9b38-9bbde2b0ed44";
const KEY_PATH = "c:/Users/Daniel/Downloads/AuthKey_B53WPHJTLN.p8";

// Subscription + screenshot config
const SUBSCRIPTION_ID = "6765975080";
const SCREENSHOT_PATH = "C:/Users/Daniel/Projects/Wingmate/public/winback-review-screenshot.png";
const FILE_NAME = "winback-review.png";

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
  // 1. Idempotency check
  console.log(`[1] Idempotency check: GET screenshot for subscription ${SUBSCRIPTION_ID}...`);
  const existing = await api("GET", `/subscriptions/${SUBSCRIPTION_ID}/appStoreReviewScreenshot`);
  console.log(`    status: ${existing.status}`);
  if (existing.ok && existing.data && existing.data.data) {
    const a = existing.data.data.attributes || {};
    console.log(`    EXISTS: screenshot ${existing.data.data.id} state=${a.assetDeliveryState?.state || a.state || "unknown"} fileName=${a.fileName}`);
    if (a.assetDeliveryState?.state === "COMPLETE" || a.uploaded === true) {
      console.log(`    screenshot already exists and is complete — skipping upload`);
      // still continue to attempt review submission
    } else {
      console.log(`    screenshot exists but not complete — skipping upload anyway (manual cleanup may be needed)`);
    }
  } else {
    // 2. Read file
    console.log(`[2] Reading file ${SCREENSHOT_PATH}...`);
    const fileBuffer = readFileSync(SCREENSHOT_PATH);
    const fileSize = fileBuffer.length;
    const md5 = createHash("md5").update(fileBuffer).digest("hex");
    console.log(`    size: ${fileSize} bytes, md5: ${md5}`);

    // 3. Reserve
    console.log(`[3] Reserving upload slot...`);
    const reserve = await api("POST", `/subscriptionAppStoreReviewScreenshots`, {
      data: {
        type: "subscriptionAppStoreReviewScreenshots",
        attributes: { fileName: FILE_NAME, fileSize },
        relationships: { subscription: { data: { type: "subscriptions", id: SUBSCRIPTION_ID } } },
      },
    });
    if (!reserve.ok) {
      console.log(`    ERROR reserving:`, JSON.stringify(reserve.data, null, 2));
      return;
    }
    const screenshotId = reserve.data.data.id;
    const uploadOps = reserve.data.data.attributes.uploadOperations || [];
    console.log(`    reserved screenshot ${screenshotId} with ${uploadOps.length} upload operation(s)`);

    // 4. Upload chunks
    for (let i = 0; i < uploadOps.length; i++) {
      const op = uploadOps[i];
      const headers = {};
      for (const h of (op.requestHeaders || [])) headers[h.name] = h.value;
      const chunk = fileBuffer.slice(op.offset, op.offset + op.length);
      console.log(`[4.${i+1}] ${op.method} ${op.url.substring(0, 80)}... offset=${op.offset} length=${op.length}`);
      const upRes = await fetch(op.url, {
        method: op.method,
        headers,
        body: chunk,
      });
      const upText = await upRes.text();
      console.log(`    chunk ${i+1}/${uploadOps.length}: status=${upRes.status} body=${upText.substring(0, 200)}`);
      if (!upRes.ok) {
        console.log(`    ERROR uploading chunk ${i+1}`);
        return;
      }
    }

    // 5. Commit
    console.log(`[5] Committing screenshot...`);
    const commit = await api("PATCH", `/subscriptionAppStoreReviewScreenshots/${screenshotId}`, {
      data: {
        type: "subscriptionAppStoreReviewScreenshots",
        id: screenshotId,
        attributes: { uploaded: true, sourceFileChecksum: md5 },
      },
    });
    if (!commit.ok) {
      console.log(`    ERROR committing:`, JSON.stringify(commit.data, null, 2));
      return;
    }
    console.log(`    committed.`);

    // 6. Verify
    console.log(`[6] Verifying...`);
    const verify = await api("GET", `/subscriptions/${SUBSCRIPTION_ID}/appStoreReviewScreenshot`);
    if (verify.ok && verify.data && verify.data.data) {
      const a = verify.data.data.attributes || {};
      console.log(`    state: ${a.assetDeliveryState?.state || "unknown"}`);
      console.log(`    fileName: ${a.fileName}`);
      console.log(`    fileSize: ${a.fileSize}`);
      console.log(`    full assetDeliveryState: ${JSON.stringify(a.assetDeliveryState)}`);
    } else {
      console.log(`    ERROR verifying:`, verify.status, verify.data);
    }
  }

  // 7. Attempt review submission (old-style)
  console.log(`\n[7] Attempting subscriptionSubmissions for ${SUBSCRIPTION_ID}...`);
  const submit = await api("POST", `/subscriptionSubmissions`, {
    data: {
      type: "subscriptionSubmissions",
      relationships: { subscription: { data: { type: "subscriptions", id: SUBSCRIPTION_ID } } },
    },
  });
  console.log(`    status: ${submit.status}`);
  if (submit.ok) {
    console.log(`    SUCCESS: created submission ${submit.data.data?.id}`);
    console.log(`    data: ${JSON.stringify(submit.data.data, null, 2)}`);
  } else {
    console.log(`    submission failed (expected if no submission flow available):`, JSON.stringify(submit.data, null, 2));
  }

  // 8. Final state
  console.log(`\n[8] Final subscription state:`);
  const finalSub = await api("GET", `/subscriptions/${SUBSCRIPTION_ID}`);
  if (finalSub.ok) {
    const a = finalSub.data.data.attributes;
    console.log(`    state: ${a.state}`);
    console.log(`    productId: ${a.productId}`);
    console.log(`    name: ${a.name}`);
  } else {
    console.log(`    ERROR:`, finalSub.data);
  }

  console.log(`\nDone.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
