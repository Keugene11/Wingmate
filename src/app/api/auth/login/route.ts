import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: { prompt: "select_account" },
      skipBrowserRedirect: true,
    },
  });

  if (data?.url) {
    return NextResponse.redirect(data.url);
  }

  // Fallback: redirect to plans with error
  const fallback = new URL("/plans", origin);
  fallback.searchParams.set("error", error?.message || "login_failed");
  return NextResponse.redirect(fallback.toString());
}
