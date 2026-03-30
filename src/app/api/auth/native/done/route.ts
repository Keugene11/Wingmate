import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * After Auth.js completes OAuth in SFSafariViewController, it redirects here.
 * We read the session token from the cookie and pass it to the native app
 * via a deep link. The WKWebView will then set this cookie on its own domain.
 */
export async function GET() {
  const cookieStore = await cookies();

  // Auth.js v5 stores the session in this cookie
  const sessionToken =
    cookieStore.get("authjs.session-token")?.value ||
    cookieStore.get("__Secure-authjs.session-token")?.value;

  if (!sessionToken) {
    return new NextResponse(
      `<html><body><script>window.location.href = "wingmate://auth/callback?error=no_session";</script></body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  return new NextResponse(
    `<html><body><script>window.location.href = "wingmate://auth/callback?session_token=${encodeURIComponent(sessionToken)}";</script></body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}
