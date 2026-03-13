import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Triggers Google OAuth sign-in via standard PKCE flow.
 * In standalone PWA mode, uses a popup to avoid crashing the PWA window.
 */
export async function signInWithGoogle() {
  const supabase = createClient();

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone ===
      true;

  if (isStandalone) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/complete`,
        queryParams: { prompt: "select_account" },
        skipBrowserRedirect: true,
      },
    });

    if (error) return { error };
    if (data?.url) {
      window.open(data.url, "_blank", "popup,width=500,height=600");
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
