import { readFileSync, mkdirSync } from "fs";
import { createSign } from "crypto";
import sharp from "sharp";

const SA_PATH = "c:/Users/Daniel/Downloads/voicenote-pro-484818-6d6db67c7fdb.json";
const PACKAGE = "com.approachai.twa";
const OUT_DIR = "scripts/play-store-assets";

mkdirSync(OUT_DIR, { recursive: true });

const sa = JSON.parse(readFileSync(SA_PATH, "utf8"));

// --- Auth ---
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

// --- API helpers ---
const BASE = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE}`;

async function api(token, method, path, body, contentType = "application/json") {
  const url = `${BASE}/${path}`;
  const headers = { Authorization: `Bearer ${token}` };
  if (body && contentType) headers["Content-Type"] = contentType;
  const res = await fetch(url, { method, headers, body: body || undefined });
  const text = await res.text();
  if (!res.ok) throw new Error(`API ${res.status} ${path}: ${text}`);
  return text ? JSON.parse(text) : {};
}

async function uploadImage(token, editId, language, imageType, imageBuffer) {
  const url = `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${PACKAGE}/edits/${editId}/listings/${language}/${imageType}?uploadType=media`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "image/png",
    },
    body: imageBuffer,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Upload ${imageType} ${res.status}: ${text}`);
  console.log(`  Uploaded ${imageType}: OK`);
  return JSON.parse(text);
}

// --- Generate phone screenshots (1080x1920) ---
function phoneSvg(title, subtitle, features, accentColor) {
  const featureItems = features.map((f, i) =>
    `<text x="540" y="${950 + i * 120}" fill="#e0e0e0" font-family="Arial, Helvetica, sans-serif" font-weight="400" font-size="42" text-anchor="middle" dominant-baseline="central">${f}</text>`
  ).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#1a1a1a"/>
        <stop offset="100%" style="stop-color:#0d0d0d"/>
      </linearGradient>
    </defs>
    <rect width="1080" height="1920" fill="url(#bg)"/>

    <!-- App icon area -->
    <rect x="415" y="200" width="250" height="250" rx="50" fill="#2a2a2a"/>
    <text x="540" y="325" fill="white" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="120" text-anchor="middle" dominant-baseline="central">W</text>

    <!-- Title -->
    <text x="540" y="580" fill="white" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="64" text-anchor="middle" dominant-baseline="central">${title}</text>

    <!-- Subtitle -->
    <text x="540" y="680" fill="${accentColor}" font-family="Arial, Helvetica, sans-serif" font-weight="500" font-size="38" text-anchor="middle" dominant-baseline="central">${subtitle}</text>

    <!-- Divider -->
    <rect x="340" y="780" width="400" height="3" fill="#333" rx="2"/>

    <!-- Features -->
    ${featureItems}

    <!-- Bottom accent -->
    <rect x="0" y="1880" width="1080" height="40" fill="${accentColor}" opacity="0.3"/>
  </svg>`;
}

async function generateScreenshots() {
  console.log("Generating phone screenshots...");
  const screens = [
    {
      title: "Wingmate",
      subtitle: "Your Cold Approach Wingman",
      features: [
        "AI-powered confidence coaching",
        "Personalized conversation starters",
        "Real-time chat practice",
        "Build authentic connections",
      ],
      accent: "#6366f1",
    },
    {
      title: "Photo Analysis",
      subtitle: "Get Situational Advice",
      features: [
        "Upload a photo of your situation",
        "Get tailored opening lines",
        "Context-aware suggestions",
        "Respectful approach strategies",
      ],
      accent: "#8b5cf6",
    },
    {
      title: "AI Chat Coach",
      subtitle: "Practice Makes Perfect",
      features: [
        "Conversational practice sessions",
        "Real-time feedback and tips",
        "Build confidence naturally",
        "Available 24/7 on your phone",
      ],
      accent: "#ec4899",
    },
    {
      title: "Go Premium",
      subtitle: "Unlimited Coaching Access",
      features: [
        "Unlimited photo analyses",
        "Unlimited chat sessions",
        "Priority AI responses",
        "Cancel anytime",
      ],
      accent: "#f59e0b",
    },
  ];

  const buffers = [];
  for (let i = 0; i < screens.length; i++) {
    const s = screens[i];
    const svg = phoneSvg(s.title, s.subtitle, s.features, s.accent);
    const buf = await sharp(Buffer.from(svg)).png().toBuffer();
    const path = `${OUT_DIR}/screenshot-${i + 1}.png`;
    await sharp(buf).toFile(path);
    console.log(`  Generated screenshot ${i + 1}: ${s.title}`);
    buffers.push(buf);
  }
  return buffers;
}

// --- Generate feature graphic (1024x500) ---
async function generateFeatureGraphic() {
  console.log("Generating feature graphic...");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#1a1a1a"/>
        <stop offset="50%" style="stop-color:#2a1a3a"/>
        <stop offset="100%" style="stop-color:#1a1a2e"/>
      </linearGradient>
    </defs>
    <rect width="1024" height="500" fill="url(#bg)"/>
    <rect x="80" y="140" width="120" height="120" rx="28" fill="#333"/>
    <text x="140" y="200" fill="white" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="60" text-anchor="middle" dominant-baseline="central">W</text>
    <text x="240" y="175" fill="white" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="56" text-anchor="start" dominant-baseline="central">Wingmate</text>
    <text x="240" y="235" fill="#a78bfa" font-family="Arial, Helvetica, sans-serif" font-weight="500" font-size="26" text-anchor="start" dominant-baseline="central">Your Cold Approach Wingman</text>
    <text x="512" y="370" fill="#999" font-family="Arial, Helvetica, sans-serif" font-weight="400" font-size="22" text-anchor="middle" dominant-baseline="central">AI Photo Analysis  ·  Chat Coaching  ·  Confidence Building</text>
  </svg>`;

  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  await sharp(buf).toFile(`${OUT_DIR}/feature-graphic.png`);
  console.log("  Generated feature graphic");
  return buf;
}

// --- Main ---
async function main() {
  const token = await getToken();
  console.log("Authenticated.\n");

  const screenshotBuffers = await generateScreenshots();
  const featureGraphicBuf = await generateFeatureGraphic();

  console.log("\nCreating Play Store edit...");
  const edit = await api(token, "POST", "edits", "{}");
  console.log(`Edit ID: ${edit.id}`);

  // Set store listing
  console.log("\nSetting store listing...");
  const listing = {
    language: "en-US",
    title: "Wingmate - Cold Approach Coach",
    shortDescription: "AI wingman that builds your confidence for real-life cold approaches.",
    fullDescription: `Wingmate is your personal AI-powered cold approach confidence coach. Whether you're nervous about talking to someone new or want to sharpen your social skills, Wingmate has your back.

FEATURES

Photo Analysis
Upload a photo of someone you want to approach and get personalized, situational conversation starters and tips tailored to the moment.

AI Chat Coach
Practice conversations and get real-time coaching from an AI that understands social dynamics. Build confidence through guided practice sessions.

Confidence Building
Go from hesitation to action with practical, respectful advice that focuses on building authentic connections.

Always Available
Get coaching whenever you need it, right from your phone. Your AI wingman is always ready.

WHY WINGMATE?

Wingmate helps you develop genuine social confidence. No pickup lines or manipulation — just practical coaching to help you connect authentically with people you find interesting.

Whether you're at a coffee shop, bookstore, gym, or anywhere else, Wingmate gives you the confidence and conversation tools to make your move.

Note: Wingmate promotes respectful, genuine social interactions. Our AI coach focuses on building your confidence and communication skills.`,
  };

  await api(token, "PUT", `edits/${edit.id}/listings/en-US`, JSON.stringify(listing));
  console.log("  Store listing set!");

  // Upload screenshots
  console.log("\nUploading phone screenshots...");
  for (const buf of screenshotBuffers) {
    await uploadImage(token, edit.id, "en-US", "phoneScreenshots", buf);
  }

  // Upload feature graphic
  console.log("\nUploading feature graphic...");
  await uploadImage(token, edit.id, "en-US", "featureGraphic", featureGraphicBuf);

  // Commit the edit
  console.log("\nCommitting edit...");
  const commit = await api(token, "POST", `edits/${edit.id}:commit`);
  console.log(`Committed! Edit: ${commit.id}`);

  console.log("\n=== STORE LISTING COMPLETE ===");
  console.log(`Title: ${listing.title}`);
  console.log(`Short desc: ${listing.shortDescription}`);
  console.log(`Screenshots: ${screenshotBuffers.length}`);
  console.log(`Feature graphic: uploaded`);
  console.log("\nNext: Complete content rating + target audience in Play Console");
}

main().catch(e => { console.error(e); process.exit(1); });
