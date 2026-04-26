// Compose iPad-13 (App Store Connect) screenshots from the iPhone shots.
// Apple requires iPad 13" Display at 2064x2752 portrait.
//
// The app is mobile-first (max-w-md) so a real tablet capture would be a
// narrow column on a huge canvas. Instead we frame the iPhone-sized
// captures on a 2064x2752 canvas with a bold headline, rounded corners,
// and a soft drop shadow — same approach as the Play Store tablet shots.

import sharp from "sharp";
import { mkdirSync, existsSync } from "fs";

const SCREENS = [
  { name: "01_welcome", title: "Overcome approach anxiety", subtitle: "A wingman in your pocket" },
  { name: "02_today", title: "Build the streak", subtitle: "One conversation at a time" },
  { name: "03_plan", title: "Your weekly game plan", subtitle: "One focus. No excuses." },
  { name: "04_coach", title: "A coach in your pocket", subtitle: "Real advice, 24/7" },
  { name: "05_community", title: "You're not alone", subtitle: "Real stories from real guys" },
];

// App Store Connect iPad Pro 12.9" 3rd gen+ slot — expects exactly 2048x2732.
const CANVAS_W = 2048;
const CANVAS_H = 2732;
const BG = "#f4f4f4";
const TEXT_COLOR = "#111111";
const SUBTITLE_COLOR = "#6a6a6a";

const HEADER_TOP = 180;
const TITLE_SIZE = 110;
const SUBTITLE_SIZE = 54;
const TITLE_SUBTITLE_GAP = 40;
const HEADER_PHONE_GAP = 110;

const PHONE_H = 1960;
// Match iPhone 6.7 aspect (1290x2796 → 1290/2796 ≈ 0.461)
const PHONE_W = Math.round(PHONE_H * (1290 / 2796));

const CORNER_RADIUS = 60;
const SHADOW_BLUR = 50;
const SHADOW_OFFSET_Y = 32;
const SHADOW_ALPHA = 0.22;

function escapeXml(s) {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c],
  );
}

function headerSvg(title, subtitle) {
  const titleY = HEADER_TOP + TITLE_SIZE;
  const subtitleY = titleY + TITLE_SUBTITLE_GAP + SUBTITLE_SIZE * 0.85;
  return Buffer.from(
    `<svg width="${CANVAS_W}" height="${HEADER_TOP + TITLE_SIZE + TITLE_SUBTITLE_GAP + SUBTITLE_SIZE + 40}" xmlns="http://www.w3.org/2000/svg">` +
      `<style>
        .t { font-family: 'DM Sans','Helvetica Neue',Arial,sans-serif; font-weight: 800; letter-spacing: -1.4px; }
        .s { font-family: 'DM Sans','Helvetica Neue',Arial,sans-serif; font-weight: 500; }
      </style>` +
      `<text x="${CANVAS_W / 2}" y="${titleY}" text-anchor="middle" class="t" font-size="${TITLE_SIZE}" fill="${TEXT_COLOR}">${escapeXml(title)}</text>` +
      `<text x="${CANVAS_W / 2}" y="${subtitleY}" text-anchor="middle" class="s" font-size="${SUBTITLE_SIZE}" fill="${SUBTITLE_COLOR}">${escapeXml(subtitle)}</text>` +
      `</svg>`,
  );
}

function roundedMaskSvg(w, h, r) {
  return Buffer.from(
    `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">` +
      `<rect x="0" y="0" width="${w}" height="${h}" rx="${r}" ry="${r}" fill="white"/>` +
      `</svg>`,
  );
}

function shadowSvg(w, h, r, alpha) {
  return Buffer.from(
    `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">` +
      `<rect x="0" y="0" width="${w}" height="${h}" rx="${r}" ry="${r}" fill="rgba(0,0,0,${alpha})"/>` +
      `</svg>`,
  );
}

async function composite(screen) {
  const input = `screenshots/ios-iphone/${screen.name}.png`;
  if (!existsSync(input)) throw new Error(`Missing ${input}`);

  const phoneLeft = Math.round((CANVAS_W - PHONE_W) / 2);
  const headerBottom = HEADER_TOP + TITLE_SIZE + TITLE_SUBTITLE_GAP + SUBTITLE_SIZE;
  const phoneTop = headerBottom + HEADER_PHONE_GAP;

  const maskBuf = roundedMaskSvg(PHONE_W, PHONE_H, CORNER_RADIUS);
  const roundedPhone = await sharp(input)
    .resize(PHONE_W, PHONE_H, { fit: "cover" })
    .composite([{ input: maskBuf, blend: "dest-in" }])
    .png()
    .toBuffer();

  const shadowLayer = await sharp(shadowSvg(PHONE_W, PHONE_H, CORNER_RADIUS, SHADOW_ALPHA))
    .blur(SHADOW_BLUR)
    .png()
    .toBuffer();

  const header = headerSvg(screen.title, screen.subtitle);

  const out = `screenshots/ios-ipad/${screen.name}.png`;
  await sharp({
    create: { width: CANVAS_W, height: CANVAS_H, channels: 4, background: BG },
  })
    .composite([
      { input: header, left: 0, top: 0 },
      { input: shadowLayer, left: phoneLeft, top: phoneTop + SHADOW_OFFSET_Y },
      { input: roundedPhone, left: phoneLeft, top: phoneTop },
    ])
    // Embed an sRGB ICC profile. Without it, App Store Connect's preview
    // pipeline (which assumes Display P3) renders the upload faded.
    .withIccProfile("srgb")
    .png()
    .toFile(out);

  console.log(`  ✓ ${out}`);
}

async function main() {
  mkdirSync("screenshots/ios-ipad", { recursive: true });
  console.log(`Compositing ${SCREENS.length} iPad screenshots at ${CANVAS_W}x${CANVAS_H}...\n`);
  for (const s of SCREENS) {
    await composite(s);
  }
  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
