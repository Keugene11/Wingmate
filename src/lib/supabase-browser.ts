import { createBrowserClient } from "@supabase/ssr";
import { isNativePlatform } from "./platform";
import { openInAppBrowser } from "./capacitor";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Triggers Apple OAuth sign-in via Supabase.
 * Uses in-app browser on native Capacitor, full redirect on web.
 */
export async function signInWithApple() {
  const supabase = createClient();

  // Native Capacitor: open OAuth in SFSafariViewController
  if (isNativePlatform()) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        skipBrowserRedirect: true,
      },
    });

    if (error) return { error };
    if (data?.url) {
      await openInAppBrowser(data.url);
    }
    return { error: null };
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "apple",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  return { error };
}

export async function signInWithGoogle() {
  const supabase = createClient();

  // Native Capacitor: open OAuth in SFSafariViewController
  if (isNativePlatform()) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: "select_account" },
        skipBrowserRedirect: true,
      },
    });

    if (error) return { error };
    if (data?.url) {
      await openInAppBrowser(data.url);
    }
    return { error: null };
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: { prompt: "select_account" },
    },
  });
  return { error };
}
