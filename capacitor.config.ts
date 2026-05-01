import type { CapacitorConfig } from "@capacitor/cli";
import { KeyboardResize } from "@capacitor/keyboard";

// Set CAP_LIVE=1 to point the native app at the local Next.js dev server
// (via `adb reverse tcp:3000 tcp:3000`, which tunnels phone:localhost →
// laptop:localhost through the adb connection — no Wi-Fi / firewall config).
// Otherwise the app loads from production at wingmate.live.
const liveReload = process.env.CAP_LIVE === "1";
const liveHost = process.env.CAP_HOST || "localhost";

const config: CapacitorConfig = {
  appId: "live.wingmate.app",
  appName: "Wingmate",
  webDir: "out",
  server: liveReload
    ? {
        url: `http://${liveHost}:3000`,
        cleartext: true,
        allowNavigation: ["accounts.google.com", "*.google.com", "appleid.apple.com"],
      }
    : {
        url: "https://wingmate.live",
        cleartext: false,
        errorPath: "error.html",
        // Without this, Capacitor opens external hosts in the system browser instead
        // of navigating in the WebView — which breaks OAuth redirects to Google.
        allowNavigation: ["accounts.google.com", "*.google.com", "appleid.apple.com"],
      },
  ios: {
    // Don't let iOS auto-inset the WebView for safe areas — it leaves a
    // dead-space strip below our flex-column BottomNav on iPad. We handle
    // the home-indicator region ourselves via env(safe-area-inset-bottom).
    contentInset: "never",
    scheme: "Wingmate",
  },
  android: {
    // Strip the WebView "wv" marker so Google's OAuth pages accept us as a
    // regular Chrome browser and don't show the "this browser may not be secure" block.
    overrideUserAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: true,
      backgroundColor: "#1a1a1a",
    },
    Keyboard: {
      // None on iOS so manual keyboardOffset works for iPad floating/split
      // keyboards (visualViewport doesn't shrink for those). Android is
      // driven by visualViewport in ChatCoach — leaving the WebView at full
      // height and lifting the chat container above the keyboard via a
      // bottom offset. resizeOnFullScreen:true was tried and made things
      // worse on targetSdk 36 (the WebView resize was unreliable and
      // intermittently left the input hidden behind the keyboard).
      resize: KeyboardResize.None,
      resizeOnFullScreen: false,
    },
    StatusBar: {
      style: "DARK",
      overlaysWebView: true,
    },
  },
};

export default config;
