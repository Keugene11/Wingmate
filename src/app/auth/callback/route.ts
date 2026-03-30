import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/";
  // Prevent open redirect — only allow relative paths
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  const redirectUrl = new URL(next, request.url);

  if (code) {
    const response = NextResponse.redirect(redirectUrl);
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      // Check if this request came from a native app
      // SFSafariViewController on iOS sends a mobile Safari user-agent
      // We detect native by checking for a "native" query param added by the app
      const isNative = searchParams.get("native") === "1";

      if (isNative) {
        // Redirect to custom URL scheme so Capacitor's WKWebView gets the tokens
        const scheme = `wingmate://auth/callback?access_token=${data.session.access_token}&refresh_token=${data.session.refresh_token}`;
        return NextResponse.redirect(scheme);
      }

      return response;
    }

    if (!error) {
      return response;
    }

    // Exchange failed — redirect home with error visible
    const errorUrl = new URL("/", request.url);
    errorUrl.searchParams.set("error", error.message);
    return NextResponse.redirect(errorUrl);
  }

  return NextResponse.redirect(redirectUrl);
}
