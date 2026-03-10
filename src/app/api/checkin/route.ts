import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { XP_REWARDS, computeEarnedBadges } from "@/lib/gamification";

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
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const first = new Date(dates[0] + "T00:00:00");
  const diffFirst = Math.floor((today.getTime() - first.getTime()) / 86400000);
  if (diffFirst > 1) return 0;
  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1] + "T00:00:00");
    const curr = new Date(dates[i] + "T00:00:00");
    const diff = Math.floor((prev.getTime() - curr.getTime()) / 86400000);
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

function computeBestStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...dates].reverse();
  let best = 1, current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + "T00:00:00");
    const curr = new Date(sorted[i] + "T00:00:00");
    if (Math.floor((curr.getTime() - prev.getTime()) / 86400000) === 1) {
      current++;
      if (current > best) best = current;
    } else current = 1;
  }
  return best;
}

function computeConsecutiveApproaches(checkins: { talked: boolean }[]): number {
  let count = 0;
  for (const c of checkins) {
    if (c.talked) count++;
    else break;
  }
  return count;
}

async function getFullStats(supabase: any, userId: string) {
  const { data: allCheckins } = await supabase
    .from("checkins")
    .select("checked_in_at, talked, note")
    .eq("user_id", userId)
    .order("checked_in_at", { ascending: false });

  const checkins = allCheckins || [];
  const dates = checkins.map((c: any) => c.checked_in_at);
  const streak = computeStreak(dates);
  const bestStreak = Math.max(computeBestStreak(dates), streak);
  const totalCheckins = checkins.length;
  const totalTalked = checkins.filter((c: any) => c.talked).length;
  const approachRate = totalCheckins > 0 ? Math.round((totalTalked / totalCheckins) * 100) : 0;
  const notesWritten = checkins.filter((c: any) => c.note).length;
  const consecutiveApproaches = computeConsecutiveApproaches(checkins);

  // last 7 days
  const last7: { date: string; talked: boolean | null }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const checkin = checkins.find((c: any) => c.checked_in_at === dateStr);
    last7.push({ date: dateStr, talked: checkin ? checkin.talked : null });
  }

  const last7AllCheckedIn = last7.every((d) => d.talked !== null);

  // Weekend approaches this week
  const thisWeekSat = last7.find((d) => new Date(d.date + "T00:00:00").getDay() === 6);
  const thisWeekSun = last7.find((d) => new Date(d.date + "T00:00:00").getDay() === 0);
  const weekendApproaches = thisWeekSat?.talked === true && thisWeekSun?.talked === true;

  // History
  const history = checkins.slice(0, 14).map((c: any) => ({
    date: c.checked_in_at,
    talked: c.talked,
    note: c.note,
  }));

  return {
    checkins, dates, streak, bestStreak, totalCheckins, totalTalked,
    approachRate, notesWritten, consecutiveApproaches, last7,
    last7AllCheckedIn, weekendApproaches, history,
  };
}

// GET
export async function GET() {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date().toISOString().split("T")[0];
  const { data: todayCheckin } = await supabase
    .from("checkins").select("*").eq("user_id", user.id).eq("checked_in_at", today).single();

  const stats = await getFullStats(supabase, user.id);

  // Get profile for XP and freezes
  const { data: profile } = await supabase
    .from("profiles").select("xp, streak_freezes").eq("id", user.id).single();

  // Get earned badges
  const { data: earnedBadges } = await supabase
    .from("user_badges").select("badge_id, earned_at").eq("user_id", user.id);

  return NextResponse.json({
    checkedInToday: !!todayCheckin,
    talked: todayCheckin?.talked ?? null,
    note: todayCheckin?.note ?? null,
    streak: stats.streak,
    bestStreak: stats.bestStreak,
    totalCheckins: stats.totalCheckins,
    totalTalked: stats.totalTalked,
    approachRate: stats.approachRate,
    last7: stats.last7,
    history: stats.history,
    xp: profile?.xp ?? 0,
    streakFreezes: profile?.streak_freezes ?? 0,
    badges: (earnedBadges || []).map((b: any) => b.badge_id),
  });
}

// POST
export async function POST(req: Request) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { talked, note } = await req.json();
  const today = new Date().toISOString().split("T")[0];

  // Check if this is a new check-in or update
  const { data: existing } = await supabase
    .from("checkins").select("id").eq("user_id", user.id).eq("checked_in_at", today).single();
  const isNew = !existing;

  const { error } = await supabase.from("checkins").upsert(
    { user_id: user.id, talked, note: note || null, checked_in_at: today },
    { onConflict: "user_id,checked_in_at" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const stats = await getFullStats(supabase, user.id);

  // Get profile
  let { data: profile } = await supabase
    .from("profiles").select("xp, streak_freezes").eq("id", user.id).single();

  if (!profile) {
    await supabase.from("profiles").upsert({ id: user.id, username: "", xp: 0, streak_freezes: 0 });
    profile = { xp: 0, streak_freezes: 0 };
  }

  // Calculate XP earned (only for new check-ins)
  let xpEarned = 0;
  if (isNew) {
    xpEarned += XP_REWARDS.checkin;
    if (talked) xpEarned += XP_REWARDS.approach;
    if (note) xpEarned += XP_REWARDS.note;
    xpEarned += XP_REWARDS.streakBonus(stats.streak);

    // Award streak freeze every 7 days
    const newFreezes = stats.streak > 0 && stats.streak % 7 === 0 ? 1 : 0;

    await supabase
      .from("profiles")
      .update({
        xp: (profile.xp || 0) + xpEarned,
        streak_freezes: Math.min((profile.streak_freezes || 0) + newFreezes, 3),
      })
      .eq("id", user.id);
  }

  // Compute badges
  const { data: existingBadges } = await supabase
    .from("user_badges").select("badge_id").eq("user_id", user.id);
  const existingBadgeIds = new Set((existingBadges || []).map((b: any) => b.badge_id));

  const shouldHave = computeEarnedBadges({
    totalCheckins: stats.totalCheckins,
    totalTalked: stats.totalTalked,
    currentStreak: stats.streak,
    bestStreak: stats.bestStreak,
    notesWritten: stats.notesWritten,
    daysSinceLastCheckin: stats.dates.length > 1
      ? Math.floor((new Date(stats.dates[0] + "T00:00:00").getTime() - new Date(stats.dates[1] + "T00:00:00").getTime()) / 86400000)
      : 0,
    isFirstCheckin: stats.totalCheckins === 1,
    talkedToday: talked,
    last7AllCheckedIn: stats.last7AllCheckedIn,
    weekendApproaches: stats.weekendApproaches,
    consecutiveApproaches: stats.consecutiveApproaches,
  });

  const newBadges: string[] = [];
  for (const badgeId of shouldHave) {
    if (!existingBadgeIds.has(badgeId)) {
      await supabase.from("user_badges").insert({ user_id: user.id, badge_id: badgeId });
      newBadges.push(badgeId);
      // Award XP for new badge
      if (isNew) {
        xpEarned += XP_REWARDS.badge;
        await supabase.from("profiles").update({ xp: (profile.xp || 0) + xpEarned }).eq("id", user.id);
      }
    }
  }

  return NextResponse.json({
    success: true,
    streak: stats.streak,
    bestStreak: stats.bestStreak,
    totalCheckins: stats.totalCheckins,
    totalTalked: stats.totalTalked,
    approachRate: stats.approachRate,
    xp: (profile.xp || 0) + xpEarned,
    xpEarned,
    newBadges,
    streakFreezes: profile.streak_freezes || 0,
  });
}
