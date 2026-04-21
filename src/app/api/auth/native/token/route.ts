import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { encode } from "next-auth/jwt";
import { verifyAppleIdToken } from "@/lib/apple-verify";

const ADJECTIVES = [
  "Bold","Brave","Chill","Cool","Daring","Epic","Fierce","Grand",
  "Happy","Keen","Lucky","Mighty","Noble","Quick","Sharp","Slick",
  "Smart","Smooth","Solid","Steady","Swift","Calm","Bright","Witty",
  "Clutch","Prime","Based","Alpha","Crisp","Fresh","Hype","Lit",
  "Ace","Chief","Raw","Real","Zen","True","Peak","Woke",
];
const ANIMALS = [
  "Falcon","Tiger","Wolf","Eagle","Hawk","Lion","Bear","Fox",
  "Shark","Panther","Cobra","Raven","Jaguar","Phoenix","Viper","Otter",
  "Lynx","Puma","Stallion","Mantis","Raptor","Bison","Crane","Drake",
  "Hound","Marlin","Osprey","Rhino","Condor","Gecko","Moose","Oryx",
];

function generateUsername(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}${animal}${num}`;
}

/**
 * Accepts a native ID token from Apple/Google Sign-In SDKs,
 * verifies it, upserts the user, and returns an Auth.js session token.
 */
export async function POST(req: Request) {
  const { provider, idToken } = await req.json();

  if (!provider || !idToken) {
    return NextResponse.json({ error: "Missing provider or idToken" }, { status: 400 });
  }

  let email: string | null = null;
  let name: string | null = null;
  let avatarUrl: string | null = null;
  let providerAccountId: string | null = null;

  if (provider === "google") {
    // Verify Google ID token via tokeninfo endpoint
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!res.ok) {
      return NextResponse.json({ error: "Invalid Google token" }, { status: 401 });
    }
    const payload = await res.json();

    // Verify audience matches one of our Google client IDs (web or iOS)
    const allowedAudiences = [
      process.env.AUTH_GOOGLE_ID,
      process.env.NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    ].filter(Boolean);
    if (allowedAudiences.length > 0 && !allowedAudiences.includes(payload.aud)) {
      return NextResponse.json({ error: "Token audience mismatch" }, { status: 401 });
    }

    email = payload.email;
    name = payload.name || null;
    avatarUrl = payload.picture || null;
    providerAccountId = payload.sub;
  } else if (provider === "apple") {
    // Cryptographically verify against Apple's JWKS — do NOT trust the client SDK.
    const verified = await verifyAppleIdToken(idToken);
    if (!verified) {
      return NextResponse.json({ error: "Invalid Apple token" }, { status: 401 });
    }
    email = verified.email;
    providerAccountId = verified.sub;
  } else {
    return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
  }

  if (!providerAccountId) {
    return NextResponse.json({ error: "Could not extract user ID from token" }, { status: 401 });
  }

  // Upsert user in Neon (same logic as auth.ts signIn callback)
  const rows = await sql`
    INSERT INTO users (email, name, avatar_url, provider, provider_account_id)
    VALUES (${email}, ${name}, ${avatarUrl}, ${provider}, ${providerAccountId})
    ON CONFLICT (provider, provider_account_id) DO UPDATE SET
      email = COALESCE(EXCLUDED.email, users.email),
      name = COALESCE(EXCLUDED.name, users.name),
      avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
      updated_at = now()
    RETURNING id
  `;

  const userId = rows[0]?.id;
  if (!userId) {
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }

  // Ensure profile exists
  await sql`
    INSERT INTO profiles (id, username, avatar_url)
    VALUES (${userId}, ${generateUsername()}, ${avatarUrl})
    ON CONFLICT (id) DO NOTHING
  `;

  // Create Auth.js-compatible JWT session token
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const isProduction = process.env.NODE_ENV === "production";
  const cookieName = isProduction ? "__Secure-authjs.session-token" : "authjs.session-token";

  const sessionToken = await encode({
    token: {
      userId,
      email,
      name,
      picture: avatarUrl,
      sub: providerAccountId,
    },
    secret,
    salt: cookieName,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  // Set the session cookie directly in the response
  const response = NextResponse.json({ ok: true, token: sessionToken });
  response.cookies.set(cookieName, sessionToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });

  return response;
}
