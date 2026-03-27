import { isNativePlatform } from "./platform";

/**
 * Hide the native splash screen once the web content is ready.
 * Safe to call on web — it's a no-op if not running in Capacitor.
 */
export async function hideSplash() {
  if (!isNativePlatform()) return;
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide({ fadeOutDuration: 200 });
  } catch {}
}

/**
 * Open a URL in an in-app browser (SFSafariViewController on iOS).
 * Falls back to window.open on web.
 */
export async function openInAppBrowser(url: string) {
  if (!isNativePlatform()) {
    window.location.href = url;
    return;
  }
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url, presentationStyle: "popover" });
  } catch {
    window.location.href = url;
  }
}
