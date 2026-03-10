import sharp from "sharp";
import { mkdirSync } from "fs";

mkdirSync("public/icons", { recursive: true });

function createSvg(size, maskable = false) {
  const radius = maskable ? 0 : Math.round(size * 0.18);
  const fontSize = Math.round(size * (maskable ? 0.38 : 0.42));
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#1a1a1a" rx="${radius}"/>
  <text x="${size / 2}" y="${size / 2}" fill="white" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="${fontSize}" text-anchor="middle" dominant-baseline="central">A</text>
</svg>`);
}

const variants = [
  { name: "icon-192", size: 192, maskable: false },
  { name: "icon-512", size: 512, maskable: false },
  { name: "icon-maskable-192", size: 192, maskable: true },
  { name: "icon-maskable-512", size: 512, maskable: true },
];

for (const v of variants) {
  await sharp(createSvg(v.size, v.maskable))
    .png()
    .toFile(`public/icons/${v.name}.png`);
  console.log(`Generated ${v.name}.png`);
}

console.log("Done — all PNG icons generated.");
