// One-shot live-reload helper for Android.
// Reads capacitor.config.ts which checks CAP_LIVE; sets the env var,
// runs `cap sync` to push the dev URL into the native project, then
// `cap run android` to install + launch on a connected device.
//
// Prereqs (one-time):
// 1. USB debugging enabled on phone (Settings → About → tap Build 7×, then
//    Settings → System → Developer options → USB debugging).
// 2. Phone connected via USB cable, "Allow USB debugging" prompt accepted.
// 3. Phone on the same Wi-Fi as the laptop.
// 4. `pnpm dev` running in another terminal.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { delimiter } from "node:path";

function lanIp() {
  const nets = networkInterfaces();
  for (const list of Object.values(nets)) {
    for (const net of list ?? []) {
      if (net.family === "IPv4" && !net.internal) return net.address;
    }
  }
  return "127.0.0.1";
}

// Android Studio bundles its own JBR + SDK on Windows. Wire them up here so
// the user doesn't have to set JAVA_HOME / ANDROID_HOME / PATH manually.
const JAVA_HOME = process.env.JAVA_HOME || "C:\\Program Files\\Android\\Android Studio\\jbr";
const ANDROID_HOME =
  process.env.ANDROID_HOME ||
  process.env.ANDROID_SDK_ROOT ||
  `${process.env.LOCALAPPDATA || "C:\\Users\\Daniel\\AppData\\Local"}\\Android\\Sdk`;

if (!existsSync(JAVA_HOME)) {
  console.error(`JAVA_HOME not found at ${JAVA_HOME} — install Android Studio or set JAVA_HOME.`);
  process.exit(1);
}
if (!existsSync(ANDROID_HOME)) {
  console.error(`Android SDK not found at ${ANDROID_HOME} — install Android Studio or set ANDROID_HOME.`);
  process.exit(1);
}

const host = process.env.CAP_HOST || lanIp();
const extraPath = [
  `${JAVA_HOME}\\bin`,
  `${ANDROID_HOME}\\platform-tools`,
  `${ANDROID_HOME}\\cmdline-tools\\latest\\bin`,
  `${ANDROID_HOME}\\emulator`,
].join(delimiter);

const env = {
  ...process.env,
  CAP_LIVE: "1",
  CAP_HOST: host,
  JAVA_HOME,
  ANDROID_HOME,
  ANDROID_SDK_ROOT: ANDROID_HOME,
  PATH: `${extraPath}${delimiter}${process.env.PATH || ""}`,
};

console.log(`Pointing native app at http://${host}:3000 …`);
console.log("Make sure `pnpm dev` is running in another terminal.\n");

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: true, env, ...opts });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

// Find the first attached real device (skip emulators).
function pickTarget() {
  const r = spawnSync(`${ANDROID_HOME}\\platform-tools\\adb.exe`, ["devices"], {
    encoding: "utf8",
    env,
  });
  const lines = (r.stdout || "").split("\n").slice(1);
  for (const line of lines) {
    const id = line.trim().split(/\s+/)[0];
    if (!id) continue;
    if (id.startsWith("emulator-")) continue;
    return id;
  }
  return null;
}

const target = pickTarget();
if (!target) {
  console.error("No physical Android device found. Pair via Wireless debugging or plug in via USB.");
  process.exit(1);
}
console.log(`Target device: ${target}\n`);

// `cap sync` writes capacitor.config.json into android/ with our CAP_LIVE URL
run("npx", ["cap", "sync", "android"]);

// `cap run android` on Windows calls bare `gradlew` (no .bat) which cmd doesn't
// resolve, so do the build + install + launch manually.
const adb = `${ANDROID_HOME}\\platform-tools\\adb.exe`;
const apk = "android\\app\\build\\outputs\\apk\\debug\\app-debug.apk";
const pkg = "com.approachai.twa"; // Android applicationId, see android/app/build.gradle

console.log("\nBuilding debug APK (first time ~5 min)…");
run("cmd.exe", ["/c", ".\\gradlew.bat", "assembleDebug"], { cwd: "android", shell: false });

console.log("\nInstalling on device…");
run(adb, ["-s", target, "install", "-r", "-t", apk]);

console.log("\nLaunching…");
run(adb, ["-s", target, "shell", "am", "start", "-n", `${pkg}/.MainActivity`]);
console.log("\n✓ App launched. Edit any file → save → phone reloads.");
