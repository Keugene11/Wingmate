// Re-process screenshots with a modest saturation + contrast bump so they
// don't read as "faded" in App Store Connect's small preview pane. The
// Wingmate UI is intentionally low-contrast (light gray bg, soft shadows)
// which looks crisp at full size on a phone but reads as washed-out when
// scaled into a thumbnail.
//
// Also re-embeds an sRGB profile so ASC's color pipeline doesn't fall back
// to a Display P3 default and shift hues.

import sharp from "sharp";
import { readdirSync, renameSync, existsSync } from "fs";
import path from "path";

// Targets — only the actual app captures. The composited iPad shots already
// have polished framing and don't need a punch.
const TARGETS = [
  "screenshots/ios-iphone",
  "screenshots/android-phone",
];

let total = 0;
for (const dir of TARGETS) {
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".png")) continue;
    const fp = path.join(dir, f);
    const tmp = fp + ".tmp";
    await sharp(fp)
      // Saturation +20% gives the few accent colors (blue progress bar,
      // green badge, orange flame) some pop without distorting the
      // mostly-grayscale design. Brightness +3% lifts the off-white bg
      // (#f5f5f7) closer to pure white in the preview.
      .modulate({ saturation: 1.2, brightness: 1.03 })
      // Slight contrast bump (slope 1.06, intercept -6) tightens the
      // black point so headings look less hazy.
      .linear(1.06, -6)
      .withIccProfile("srgb")
      .png({ compressionLevel: 9 })
      .toFile(tmp);
    renameSync(tmp, fp);
    total++;
    console.log(`✓ ${fp}`);
  }
}
console.log(`\nPunched up ${total} screenshot(s).`);
