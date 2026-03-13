import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: "implicit",
      },
    }
  );
}

/**
 * Triggers Google OAuth sign-in using the implicit flow.
 * Tokens come back in the URL hash fragment and are picked up
 * automatically by the Supabase client on page load.
 */
export async function signInWithGoogle() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
      skipBrowserRedirect: true,
      queryParams: { prompt: "select_account" },
    },
  });
  if (data?.url) {
    window.location.href = data.url;
  }
  return { error };
}
