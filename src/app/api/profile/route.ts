import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";

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

// GET — fetch profile
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const rows = await sql`SELECT * FROM profiles WHERE id = ${userId} LIMIT 1`;
  const profile = rows[0] || null;

  // If no profile yet, create one
  if (!profile) {
    const username = generateUsername();
    const avatarUrl = session.user.image || null;
    const newRows = await sql`
      INSERT INTO profiles (id, username, avatar_url)
      VALUES (${userId}, ${username}, ${avatarUrl})
      ON CONFLICT (id) DO UPDATE SET username = profiles.username
      RETURNING *
    `;
    return NextResponse.json({ profile: newRows[0] });
  }

  return NextResponse.json({ profile });
}

// PATCH — update profile
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await req.json();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.username !== undefined) {
    const username = body.username.trim().slice(0, 30);
    if (username.length < 1) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }
    updates.username = username;
  }

  if (body.avatar_url !== undefined) {
    try {
      const parsed = new URL(body.avatar_url);
      if (!parsed.protocol.startsWith("http")) {
        return NextResponse.json({ error: "Invalid avatar URL" }, { status: 400 });
      }
      updates.avatar_url = body.avatar_url;
    } catch {
      return NextResponse.json({ error: "Invalid avatar URL" }, { status: 400 });
    }
  }

  if (body.goal !== undefined) {
    updates.goal = body.goal;
  }

  if (body.custom_goal !== undefined) {
    updates.custom_goal = body.custom_goal.trim().slice(0, 100);
  }

  if (body.weekly_approach_goal !== undefined) {
    const goal = Math.min(999, Math.max(0, Math.round(Number(body.weekly_approach_goal) || 0)));
    updates.weekly_approach_goal = goal;
  }

  try {
    // Build dynamic update using sql
    const setClauses: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(updates)) {
      setClauses.push(key);
      values.push(value);
    }

    // Use a single query with all possible fields
    const rows = await sql`
      UPDATE profiles SET
        updated_at = ${updates.updated_at},
        username = COALESCE(${updates.username ?? null}, username),
        avatar_url = COALESCE(${updates.avatar_url ?? null}, avatar_url),
        goal = COALESCE(${updates.goal ?? null}, goal),
        custom_goal = COALESCE(${updates.custom_goal ?? null}, custom_goal),
        weekly_approach_goal = COALESCE(${updates.weekly_approach_goal ?? null}, weekly_approach_goal)
      WHERE id = ${userId}
      RETURNING *
    `;

    return NextResponse.json({ profile: rows[0] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
