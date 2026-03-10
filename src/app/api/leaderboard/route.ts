import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );
}

const TIERS = ["bronze", "silver", "gold", "diamond"] as const;
type Tier = typeof TIERS[number];

function getTierLabel(tier: string): string {
  const labels: Record<string, string> = { bronze: "Bronze", silver: "Silver", gold: "Gold", diamond: "Diamond" };
  return labels[tier] || "Bronze";
}

// GET — fetch leaderboard for current user's tier
export async function GET() {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("league_opted_in, league_tier, weekly_xp, username")
    .eq("id", user.id)
    .single();

  if (!profile?.league_opted_in) {
    return NextResponse.json({ optedIn: false });
  }

  // Get all players in the same tier, ranked by weekly_xp
  const { data: leaderboard } = await supabase
    .from("profiles")
    .select("id, username, weekly_xp, league_tier")
    .eq("league_opted_in", true)
    .eq("league_tier", profile.league_tier)
    .order("weekly_xp", { ascending: false })
    .limit(30);

  const players = (leaderboard || []).map((p, i) => ({
    rank: i + 1,
    username: p.username || "Anonymous",
    weeklyXp: p.weekly_xp,
    isYou: p.id === user.id,
  }));

  // Find user's rank
  const userRank = players.findIndex((p) => p.isYou) + 1;

  return NextResponse.json({
    optedIn: true,
    tier: profile.league_tier,
    tierLabel: getTierLabel(profile.league_tier),
    weeklyXp: profile.weekly_xp,
    userRank,
    totalPlayers: players.length,
    leaderboard: players,
  });
}

// POST — opt in/out of leagues
export async function POST(req: Request) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action } = await req.json();

  if (action === "opt-in") {
    await supabase
      .from("profiles")
      .update({ league_opted_in: true, league_tier: "bronze", weekly_xp: 0 })
      .eq("id", user.id);
    return NextResponse.json({ success: true, optedIn: true });
  }

  if (action === "opt-out") {
    await supabase
      .from("profiles")
      .update({ league_opted_in: false })
      .eq("id", user.id);
    return NextResponse.json({ success: true, optedIn: false });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
