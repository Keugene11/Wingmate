import type { CapacitorConfig } from "@capacitor/cli";
import { KeyboardResize } from "@capacitor/keyboard";

const config: CapacitorConfig = {
  appId: "live.wingmate.app",
  appName: "Wingmate",
  webDir: "out",
  server: {
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
