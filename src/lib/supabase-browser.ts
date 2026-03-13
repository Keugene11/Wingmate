import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Returns true when the app is running as an installed PWA (home screen).
 * In standalone mode on iOS, OAuth redirects open in Safari which has a
 * separate cookie jar — the PKCE code verifier cookie is lost and the
 * auth exchange silently fails.
 */
function isStandalonePWA(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

/**
 * Triggers Google OAuth sign-in.
 * In standalone PWA mode, falls back to the implicit flow (tokens in URL
 * hash) so we don't depend on cookies surviving across browser contexts.
 */
export async function signInWithGoogle() {
  const supabase = createClient();

  if (isStandalonePWA()) {
    // Implicit flow: tokens come back in the URL hash fragment, picked up
    // automatically by the client-side Supabase library on page load.
    // We redirect to "/" instead of "/auth/callback" so the client handles it.
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        skipBrowserRedirect: true,
        queryParams: { response_type: "token" },
      },
    });
    if (data?.url) {
      window.location.href = data.url;
    }
    return { error };
  }

  // Standard PKCE flow for regular browser sessions
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
  return { error };
}
