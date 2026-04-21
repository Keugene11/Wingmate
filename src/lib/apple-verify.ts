import { createPublicKey, verify as verifyRsa } from "crypto";

// Apple rotates these infrequently. Cache in-memory per warm instance.
const JWKS_URL = "https://appleid.apple.com/auth/keys";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface AppleJwk {
  kty: string;
  kid: string;
  alg: string;
  use: string;
  n: string;
  e: string;
}

let cache: { keys: AppleJwk[]; fetchedAt: number } | null = null;

async function getKeys(): Promise<AppleJwk[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache.keys;
  const res = await fetch(JWKS_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
  const { keys } = (await res.json()) as { keys: AppleJwk[] };
  cache = { keys, fetchedAt: Date.now() };
  return keys;
}

function allowedAudiences(): string[] {
  const out = new Set<string>();
  // Web Sign-in-with-Apple usually sends the services ID.
  if (process.env.AUTH_APPLE_ID) out.add(process.env.AUTH_APPLE_ID);
  // Native iOS SDK sends the app's bundle ID.
  if (process.env.NEXT_PUBLIC_APPLE_CLIENT_ID) out.add(process.env.NEXT_PUBLIC_APPLE_CLIENT_ID);
  out.add("live.wingmate.app");
  return [...out];
}

export interface VerifiedApplePayload {
  sub: string;
  email: string | null;
}

/**
 * Cryptographically verify an Apple ID token.
 * Validates: signature against Apple's JWKS, `iss`, `aud`, and `exp`.
 * Returns the verified payload or null if anything fails.
 */
export async function verifyAppleIdToken(idToken: string): Promise<VerifiedApplePayload | null> {
  const parts = idToken.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;

  let header: { kid?: string; alg?: string };
  let payload: { iss?: string; aud?: string | string[]; exp?: number; sub?: string; email?: string };
  try {
    header = JSON.parse(Buffer.from(headerB64, "base64url").toString());
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
  } catch {
    return null;
  }

  if (payload.iss !== "https://appleid.apple.com") return null;
  if (!payload.exp || payload.exp * 1000 <= Date.now()) return null;

  const auds = Array.isArray(payload.aud) ? payload.aud : payload.aud ? [payload.aud] : [];
  const allowed = allowedAudiences();
  if (!auds.some((a) => allowed.includes(a))) return null;

  if (!header.kid || header.alg !== "RS256") return null;

  const keys = await getKeys();
  const jwk = keys.find((k) => k.kid === header.kid && k.alg === "RS256");
  if (!jwk) return null;

  const pub = createPublicKey({ key: jwk as unknown as object, format: "jwk" });
  const data = Buffer.from(`${headerB64}.${payloadB64}`);
  const signature = Buffer.from(sigB64, "base64url");
  const ok = verifyRsa("RSA-SHA256", data, pub, signature);
  if (!ok) return null;

  if (!payload.sub) return null;
  return { sub: payload.sub, email: payload.email ?? null };
}
