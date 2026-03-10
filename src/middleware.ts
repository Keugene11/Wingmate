import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Public paths: login, auth, pricing (visible to logged-in users without sub)
  const isPublicPath =
    pathname.startsWith("/login") || pathname.startsWith("/auth") ||
    pathname.startsWith("/privacy") || pathname.startsWith("/offline");

  // If not logged in and not on public page, redirect to login
  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // If logged in and on login page, redirect to home
  if (user && pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // For logged-in users on the home page, check subscription or free usage
  if (user && pathname === "/") {
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("status")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .single();

    if (!subscription) {
      // Check if user still has free sessions
      const { createClient: createAdmin } = await import("@supabase/supabase-js");
      const admin = createAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data: usage } = await admin
        .from("usage")
        .select("free_sessions_used, free_messages_used")
        .eq("user_id", user.id)
        .single();

      const sessionsUsed = usage?.free_sessions_used ?? 0;
      const messagesUsed = usage?.free_messages_used ?? 0;
      if (sessionsUsed >= 3 || messagesUsed >= 10) {
        const url = request.nextUrl.clone();
        url.pathname = "/pricing";
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/|.well-known/).*)",
  ],
};
