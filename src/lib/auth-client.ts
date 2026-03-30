import { signIn } from "next-auth/react";
import { isNativePlatform } from "./platform";
import { openInAppBrowser } from "./capacitor";

/**
 * Triggers Google OAuth sign-in.
 * Uses in-app browser on native Capacitor, Auth.js redirect on web.
 */
export async function signInWithGoogle() {
  if (isNativePlatform()) {
    await openInAppBrowser(`${window.location.origin}/api/auth/native/google`);
    return { error: null };
  }
  await signIn("google", { redirectTo: "/" });
  return { error: null };
}

/**
 * Triggers Apple OAuth sign-in.
 * Uses in-app browser on native Capacitor, Auth.js redirect on web.
 */
export async function signInWithApple() {
  if (isNativePlatform()) {
    await openInAppBrowser(`${window.location.origin}/api/auth/native/apple`);
    return { error: null };
  }
  await signIn("apple", { redirectTo: "/" });
  return { error: null };
}
