import { isNativePlatform, isNativeiOS } from "./platform";

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
 * When the native app receives a wingmate:// URL with the session token,
 * set the Auth.js session cookie in the WKWebView via a POST to /api/auth/native/session.
 */
export async function setupAuthDeepLinkListener() {
  if (!isNativePlatform()) return;
  try {
    const { App } = await import("@capacitor/app");
    App.addListener("appUrlOpen", async ({ url }) => {
      if (!url.includes("auth/callback")) return;
      const params = new URL(url);
      const sessionToken = params.searchParams.get("session_token");
      const error = params.searchParams.get("error");

      // Close the in-app browser
      try {
        const { Browser } = await import("@capacitor/browser");
        await Browser.close();
      } catch {}

      if (error || !sessionToken) return;

      // Set the Auth.js session cookie in the WKWebView
      try {
        await fetch("/api/auth/native/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: sessionToken }),
        });
        window.location.href = "/";
      } catch {}
    });
  } catch {}
}

/**
 * Initialize native social login plugins (Apple + Google).
 * Idempotent — repeated calls return the same in-flight promise.
 * Throws if init fails so callers can surface the real error.
 */
let socialLoginInitPromise: Promise<void> | null = null;

export function initSocialLogin(): Promise<void> {
  if (!isNativePlatform()) return Promise.resolve();
  if (socialLoginInitPromise) return socialLoginInitPromise;
  socialLoginInitPromise = (async () => {
    const webClientId = (process.env.NEXT_PUBLIC_AUTH_GOOGLE_ID || "").trim();
    const iOSClientId = (process.env.NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID || "").trim();
    const appleClientId = (process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || "live.wingmate.app").trim();
    if (!webClientId) throw new Error("NEXT_PUBLIC_AUTH_GOOGLE_ID is empty in this build");
    const { SocialLogin } = await import("@capgo/capacitor-social-login");
    await SocialLogin.initialize({
      apple: { clientId: appleClientId },
      google: { iOSClientId, webClientId },
    });
  })();
  // Reset on failure so a retry can re-initialize
  socialLoginInitPromise.catch(() => { socialLoginInitPromise = null; });
  return socialLoginInitPromise;
}

/**
 * Check if the native app build is outdated and needs updating.
 * Returns true if an update is required.
 */
export async function checkForUpdate(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    const { App } = await import("@capacitor/app");
    const info = await App.getInfo();
    const currentBuild = info.build;
    const res = await fetch("/api/version");
    const { minBuild } = await res.json();
    if (minBuild && currentBuild < minBuild) return true;
  } catch {}
  return false;
}

/**
 * Open a URL in an in-app browser (SFSafariViewController on iOS).
 * Also listens for the browser to close, and if the user is now
 * authenticated (session cookie was set via deep link), reloads the page.
 * Falls back to window.location on web.
 */
export async function openInAppBrowser(url: string) {
  if (!isNativePlatform()) {
    window.location.href = url;
    return;
  }
  try {
    const { Browser } = await import("@capacitor/browser");
    Browser.addListener("browserFinished", async () => {
      // Check if the deep link handler already set the session
      try {
        const res = await fetch("/api/profile");
        const data = await res.json();
        if (data.profile) {
          window.location.href = "/";
        }
      } catch {}
    });
    await Browser.open({ url, presentationStyle: "fullscreen" });
  } catch {
    window.location.href = url;
  }
}
