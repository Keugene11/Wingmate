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
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}

function computeStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  // dates are sorted desc from the query
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const first = new Date(dates[0] + "T00:00:00");
  // If most recent check-in isn't today or yesterday, streak is 0
  const diffFirst = Math.floor((today.getTime() - first.getTime()) / 86400000);
  if (diffFirst > 1) return 0;

  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1] + "T00:00:00");
    const curr = new Date(dates[i] + "T00:00:00");
    const diff = Math.floor((prev.getTime() - curr.getTime()) / 86400000);
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// GET — fetch today's check-in status + streak + last 7 days
export async function GET() {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date().toISOString().split("T")[0];

  // Get today's check-in
  const { data: todayCheckin } = await supabase
    .from("checkins")
    .select("*")
    .eq("user_id", user.id)
    .eq("checked_in_at", today)
    .single();

  // Get last 30 days for streak calculation
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: recentCheckins } = await supabase
    .from("checkins")
    .select("checked_in_at, talked")
    .eq("user_id", user.id)
    .gte("checked_in_at", thirtyDaysAgo.toISOString().split("T")[0])
    .order("checked_in_at", { ascending: false });

  const dates = (recentCheckins || []).map((c) => c.checked_in_at);
  const streak = computeStreak(dates);

  // Build last 7 days map
  const last7: { date: string; talked: boolean | null }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const checkin = (recentCheckins || []).find((c) => c.checked_in_at === dateStr);
    last7.push({
      date: dateStr,
      talked: checkin ? checkin.talked : null,
    });
  }

  return NextResponse.json({
    checkedInToday: !!todayCheckin,
    talked: todayCheckin?.talked ?? null,
    streak,
    last7,
  });
}

// POST — record today's check-in
export async function POST(req: Request) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { talked, note } = await req.json();

  const today = new Date().toISOString().split("T")[0];

  const { error } = await supabase.from("checkins").upsert(
    {
      user_id: user.id,
      talked,
      note: note || null,
      checked_in_at: today,
    },
    { onConflict: "user_id,checked_in_at" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Re-fetch streak
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: recentCheckins } = await supabase
    .from("checkins")
    .select("checked_in_at")
    .eq("user_id", user.id)
    .gte("checked_in_at", thirtyDaysAgo.toISOString().split("T")[0])
    .order("checked_in_at", { ascending: false });

  const dates = (recentCheckins || []).map((c) => c.checked_in_at);
  const streak = computeStreak(dates);

  return NextResponse.json({ success: true, streak });
}
