import { isNativePlatform } from "./platform";
import { createClient } from "./supabase-browser";

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
 * Listen for deep link auth callbacks from OAuth.
 * When the native app receives a wingmate:// URL with tokens,
 * set the Supabase session in the WKWebView context.
 */
export async function setupAuthDeepLinkListener() {
  if (!isNativePlatform()) return;
  try {
    const { App } = await import("@capacitor/app");
    App.addListener("appUrlOpen", async ({ url }) => {
      if (!url.includes("auth/callback")) return;
      const params = new URL(url);
      const accessToken = params.searchParams.get("access_token");
      const refreshToken = params.searchParams.get("refresh_token");
      if (accessToken && refreshToken) {
        const supabase = createClient();
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        // Close the in-app browser if it's still open
        try {
          const { Browser } = await import("@capacitor/browser");
          await Browser.close();
        } catch {}
        // Navigate to home
        window.location.href = "/";
      }
    });
  } catch {}
}

/**
 * Open a URL in an in-app browser (SFSafariViewController on iOS).
 * Also listens for the browser to close, and if the user is now
 * authenticated (e.g. deep link set the session), reloads the page.
 * Falls back to window.open on web.
 */
export async function openInAppBrowser(url: string) {
  if (!isNativePlatform()) {
    window.location.href = url;
    return;
  }
  try {
    const { Browser } = await import("@capacitor/browser");
    // Listen for browser close to handle auth completion
    Browser.addListener("browserFinished", async () => {
      // Check if the deep link handler already set the session
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        window.location.href = "/";
      }
    });
    await Browser.open({ url, presentationStyle: "fullscreen" });
  } catch {
    window.location.href = url;
  }
}
