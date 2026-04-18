import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "live.wingmate.app",
  appName: "Wingmate",
  webDir: "out",
  server: {
    url: "https://wingmate.live",
    cleartext: false,
    errorPath: "error.html",
  },
  ios: {
    contentInset: "automatic",
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
      resize: "none",
      resizeOnFullScreen: false,
    },
    StatusBar: {
      style: "DARK",
      overlaysWebView: true,
    },
  },
};

export default config;
