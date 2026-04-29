// Regenerate every app icon variant from the wing glyph in WingmateLogo.tsx.
// Run after tweaking SCALE_* below to nudge how big the glyph sits inside the
// icon canvas.
//
//   pnpm exec node scripts/regenerate-app-icons.mjs
//
// The glyph itself spans roughly 80% of its 1024 viewBox horizontally, so a
// transform scale of 0.78 lands it at ~62% of the rasterized canvas — what
// most polished iOS/Android icons aim for.

import sharp from "sharp";
import { readFileSync, mkdirSync, existsSync } from "fs";
import { dirname } from "path";

const BG = "#1a1a1a";
const SCALE_REGULAR = 0.78;       // iOS, PWA, TWA legacy, Capacitor legacy
const SCALE_MASKABLE = 0.62;      // PWA maskable (Android crops aggressively)
const SCALE_ADAPTIVE_FG = 0.62;   // Capacitor adaptive foreground (transparent) — needs to match SCALE_REGULAR's apparent size on the home screen, since real launchers crop the 108dp canvas more aggressively than the 72dp viewport spec implies

const componentSrc = readFileSync("src/components/WingmateLogo.tsx", "utf8");
const PATH_DS = [...componentSrc.matchAll(/<path[^/]*d="([^"]+)"/g)].map((m) => m[1]);
if (PATH_DS.length !== 4) {
  throw new Error(`Expected 4 wing-glyph paths, got ${PATH_DS.length}`);
}

function buildSvg({ size, scale, bg }) {
  const k = (scale * size) / 1024;
  const offset = (size * (1 - scale)) / 2;

  let bgEl = "";
  if (bg === "rounded") {
    bgEl = `<rect width="${size}" height="${size}" fill="${BG}" rx="${Math.round(size * 0.18)}" ry="${Math.round(size * 0.18)}"/>`;
  } else if (bg === "square") {
    bgEl = `<rect width="${size}" height="${size}" fill="${BG}"/>`;
  } else if (bg === "circle") {
    bgEl = `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${BG}"/>`;
  }

  const glyph = PATH_DS.map((d) => `<path d="${d}"/>`).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${bgEl}<g fill="#fff" transform="translate(${offset}, ${offset}) scale(${k})">${glyph}</g></svg>`;
}

async function emit(filePath, opts) {
  if (!existsSync(dirname(filePath))) {
    mkdirSync(dirname(filePath), { recursive: true });
  }
  const svg = buildSvg(opts);
  await sharp(Buffer.from(svg)).png().toFile(filePath);
  console.log(`  ${filePath}  (${opts.size}px, scale ${opts.scale}, bg ${opts.bg})`);
}

const TWA_DENSITIES = [
  { dir: "mdpi", legacy: 48 },
  { dir: "hdpi", legacy: 72 },
  { dir: "xhdpi", legacy: 96 },
  { dir: "xxhdpi", legacy: 144 },
  { dir: "xxxhdpi", legacy: 192 },
];

const CAP_DENSITIES = [
  { dir: "mdpi", legacy: 48, foreground: 108 },
  { dir: "hdpi", legacy: 72, foreground: 162 },
  { dir: "xhdpi", legacy: 96, foreground: 216 },
  { dir: "xxhdpi", legacy: 144, foreground: 324 },
  { dir: "xxxhdpi", legacy: 192, foreground: 432 },
];

console.log("iOS (flat black square — Apple submission requires opaque PNG):");
await emit("ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png", {
  size: 1024,
  scale: SCALE_REGULAR,
  bg: "square",
});

console.log("\nPWA (rounded):");
await emit("public/icons/icon-512.png", { size: 512, scale: SCALE_REGULAR, bg: "rounded" });
await emit("public/icons/icon-192.png", { size: 192, scale: SCALE_REGULAR, bg: "rounded" });

console.log("\nPWA maskable (full-bleed, smaller glyph):");
await emit("public/icons/icon-maskable-512.png", { size: 512, scale: SCALE_MASKABLE, bg: "square" });
await emit("public/icons/icon-maskable-192.png", { size: 192, scale: SCALE_MASKABLE, bg: "square" });

if (existsSync("android-twa/app/src/main/res")) {
  console.log("\nTWA legacy launcher icons:");
  for (const d of TWA_DENSITIES) {
    await emit(`android-twa/app/src/main/res/mipmap-${d.dir}/ic_launcher.png`, {
      size: d.legacy,
      scale: SCALE_REGULAR,
      bg: "rounded",
    });
  }
}

if (existsSync("android/app/src/main/res")) {
  console.log("\nCapacitor legacy launcher icons:");
  for (const d of CAP_DENSITIES) {
    await emit(`android/app/src/main/res/mipmap-${d.dir}/ic_launcher.png`, {
      size: d.legacy,
      scale: SCALE_REGULAR,
      bg: "rounded",
    });
    await emit(`android/app/src/main/res/mipmap-${d.dir}/ic_launcher_round.png`, {
      size: d.legacy,
      scale: SCALE_REGULAR,
      bg: "circle",
    });
  }

  console.log("\nCapacitor adaptive foreground (transparent, generous safe-zone padding):");
  for (const d of CAP_DENSITIES) {
    await emit(`android/app/src/main/res/mipmap-${d.dir}/ic_launcher_foreground.png`, {
      size: d.foreground,
      scale: SCALE_ADAPTIVE_FG,
      bg: "none",
    });
  }
}

console.log("\nDone.");
