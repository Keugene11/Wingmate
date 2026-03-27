import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "live.wingmate.app",
  appName: "Wingmate",
  webDir: "out",
  server: {
    url: "https://wingmate.live",
    cleartext: false,
  },
  ios: {
    contentInset: "automatic",
    scheme: "Wingmate",
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
      resize: "body",
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: "DARK",
      overlaysWebView: true,
    },
  },
};

export default config;
