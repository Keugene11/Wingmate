import { signIn } from "next-auth/react";
import { isNativePlatform } from "./platform";

/**
 * Attempt native sign-in using the SocialLogin Capacitor plugin.
 * Returns true if successful, false if native sign-in is unavailable.
 */
async function nativeSignIn(provider: "apple" | "google"): Promise<boolean> {
  try {
    const { SocialLogin } = await import("@capgo/capacitor-social-login");
    const res = await SocialLogin.login({
      provider,
      options: provider === "google"
        ? { forcePrompt: true }
        : { scopes: ["name", "email"] },
    });

    // Extract the ID token from the response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = res?.result as any;
    const idToken: string | null = result?.idToken ?? null;

    if (!idToken) {
      console.error("Native sign-in returned no idToken");
      return false;
    }

    // Send token to our backend to verify and create session
    const tokenRes = await fetch("/api/auth/native/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, idToken }),
    });

    if (!tokenRes.ok) {
      console.error("Token verification failed:", await tokenRes.text());
      return false;
    }

    // Cookie is set by the response — reload to pick up the session
    window.location.href = "/";
    return true;
  } catch (e: unknown) {
    const error = e as { code?: string; message?: string };
    // User cancelled — not an error
    if (error.message?.includes("cancel") || error.code === "SIGN_IN_CANCELLED") {
      return true; // Return true to prevent fallback to browser
    }
    console.error("Native sign-in error:", e);
    return false;
  }
}

/**
 * Triggers Google OAuth sign-in.
 * Uses native Google Sign-In on Capacitor, Auth.js redirect on web.
 */
export async function signInWithGoogle() {
  if (isNativePlatform()) {
    const success = await nativeSignIn("google");
    if (success) return { error: null };
    // Native failed on Android — fall back to browser OAuth
    const { isNativeAndroid } = await import("./platform");
    if (isNativeAndroid()) {
      const { openInAppBrowser } = await import("./capacitor");
      await openInAppBrowser("/api/auth/native/google");
      return { error: null };
    }
    return { error: "Sign-in failed" };
  }
  await signIn("google", { redirectTo: "/" });
  return { error: null };
}

/**
 * Triggers Apple OAuth sign-in.
 * Uses native Apple Sign-In on Capacitor, Auth.js redirect on web.
 */
export async function signInWithApple() {
  if (isNativePlatform()) {
    const success = await nativeSignIn("apple");
    if (success) return { error: null };
    return { error: "Sign-in failed" };
  }
  await signIn("apple", { redirectTo: "/" });
  return { error: null };
}
