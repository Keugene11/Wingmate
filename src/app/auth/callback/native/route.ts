import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

/**
 * Native OAuth callback — exchanges the auth code for a session,
 * then redirects to the wingmate:// URL scheme so the Capacitor
 * WKWebView can pick up the tokens.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return new NextResponse(
      '<html><body><p>Authentication failed. Please close this window and try again.</p></body></html>',
      { headers: { "Content-Type": "text/html" } }
    );
  }

  const response = NextResponse.redirect(new URL("/", request.url));
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

  if (error || !data.session) {
    return new NextResponse(
      '<html><body><p>Authentication failed. Please close this window and try again.</p></body></html>',
      { headers: { "Content-Type": "text/html" } }
    );
  }

  // Return an HTML page that redirects via URL scheme.
  // Client-side redirect is more reliable than a server 302 to a custom scheme.
  const html = `<!DOCTYPE html>
<html>
<head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body>
<p style="text-align:center;margin-top:40vh;font-family:system-ui;color:#999">Signing you in...</p>
<script>
  window.location.href = "wingmate://auth/callback?access_token=${data.session.access_token}&refresh_token=${data.session.refresh_token}";
  // Fallback: if URL scheme doesn't work after 2s, redirect to web
  setTimeout(function() { window.location.href = "/"; }, 2000);
</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}
