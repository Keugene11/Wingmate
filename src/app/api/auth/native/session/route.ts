import { NextResponse } from "next/server";
import { decode } from "next-auth/jwt";

/**
 * Sets the Auth.js session cookie in the WKWebView context.
 * Called by the deep link handler after receiving the token from SFSafariViewController.
 *
 * Verifies the token's signature before setting the cookie — otherwise this
 * endpoint lets anyone attach an arbitrary opaque string as the session cookie
 * (which wouldn't grant access because auth() also validates, but we don't
 * want to cache garbage cookies on the client either).
 */
export async function POST(req: Request) {
  const { token } = await req.json();
  if (!token) return NextResponse.json({ error: "No token" }, { status: 400 });

  const secret = process.env.AUTH_SECRET;
  if (!secret) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

  const isProduction = process.env.NODE_ENV === "production";
  const cookieName = isProduction ? "__Secure-authjs.session-token" : "authjs.session-token";

  const decoded = await decode({ token, secret, salt: cookieName }).catch(() => null);
  if (!decoded || !decoded.userId) {
    return NextResponse.json({ error: "Invalid session token" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(cookieName, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  return response;
}
