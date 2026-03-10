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
    .select("checked_in_at, talked, note, opportunities_count, approaches_count, successes_count")
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

  // Approach outcome stats
  const totalOpportunities = checkins.reduce((sum: number, c: any) => sum + (c.opportunities_count || 0), 0);
  const totalApproaches = checkins.reduce((sum: number, c: any) => sum + (c.approaches_count || 0), 0);
  const totalSuccesses = checkins.reduce((sum: number, c: any) => sum + (c.successes_count || 0), 0);
  const totalFailures = totalApproaches - totalSuccesses;
  const totalDidntApproach = checkins.filter((c: any) => !c.talked).length;
  const successRate = totalApproaches > 0 ? Math.round((totalSuccesses / totalApproaches) * 100) : 0;
  const approachConversionRate = totalOpportunities > 0 ? Math.round((totalApproaches / totalOpportunities) * 100) : 0;

  // last 7 days
  const last7: { date: string; talked: boolean | null; approaches: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const checkin = checkins.find((c: any) => c.checked_in_at === dateStr);
    last7.push({ date: dateStr, talked: checkin ? checkin.talked : null, approaches: checkin?.approaches_count || 0 });
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
    opportunities: c.opportunities_count || 0,
    approaches: c.approaches_count || 0,
    successes: c.successes_count || 0,
  }));

  return {
    checkins, dates, streak, bestStreak, totalCheckins, totalTalked,
    approachRate, notesWritten, consecutiveApproaches, last7,
    last7AllCheckedIn, weekendApproaches, history,
    totalOpportunities, totalApproaches, totalSuccesses, totalFailures,
    totalDidntApproach, successRate, approachConversionRate,
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
    opportunitiesCount: todayCheckin?.opportunities_count ?? 0,
    approachesCount: todayCheckin?.approaches_count ?? 0,
    successesCount: todayCheckin?.successes_count ?? 0,
    streak: stats.streak,
    bestStreak: stats.bestStreak,
    totalCheckins: stats.totalCheckins,
    totalTalked: stats.totalTalked,
    approachRate: stats.approachRate,
    totalOpportunities: stats.totalOpportunities,
    totalApproaches: stats.totalApproaches,
    totalSuccesses: stats.totalSuccesses,
    totalFailures: stats.totalFailures,
    totalDidntApproach: stats.totalDidntApproach,
    successRate: stats.successRate,
    approachConversionRate: stats.approachConversionRate,
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

  const { talked, note, opportunitiesCount, approachesCount, successesCount } = await req.json();
  const today = new Date().toISOString().split("T")[0];

  // Check if this is a new check-in or update
  const { data: existing } = await supabase
    .from("checkins").select("id").eq("user_id", user.id).eq("checked_in_at", today).single();
  const isNew = !existing;

  const { error } = await supabase.from("checkins").upsert(
    {
      user_id: user.id,
      talked,
      note: note || null,
      checked_in_at: today,
      opportunities_count: opportunitiesCount || 0,
      approaches_count: approachesCount || (talked ? 1 : 0),
      successes_count: successesCount || 0,
    },
    { onConflict: "user_id,checked_in_at" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const stats = await getFullStats(supabase, user.id);

  // Get profile (single query with all needed fields)
  let { data: profile } = await supabase
    .from("profiles")
    .select("xp, streak_freezes")
    .eq("id", user.id)
    .single();

  if (!profile) {
    await supabase.from("profiles").upsert({ id: user.id, username: "", xp: 0, streak_freezes: 0 });
    profile = { xp: 0, streak_freezes: 0 };
  }

  let currentXp = profile.xp || 0;
  let currentFreezes = profile.streak_freezes || 0;

  // Calculate XP earned (only for new check-ins)
  let xpEarned = 0;
  if (isNew) {
    xpEarned += XP_REWARDS.checkin;
    if (talked) xpEarned += XP_REWARDS.approach;
    if (note) xpEarned += XP_REWARDS.note;
    xpEarned += XP_REWARDS.streakBonus(stats.streak);

    // Award streak freeze every 7 days
    const newFreezes = stats.streak > 0 && stats.streak % 7 === 0 ? 1 : 0;

    currentXp += xpEarned;
    currentFreezes = Math.min(currentFreezes + newFreezes, 3);

    await supabase
      .from("profiles")
      .update({ xp: currentXp, streak_freezes: currentFreezes })
      .eq("id", user.id);
  }

  // Compute badges (runs on both new and update to catch badges from talked changes)
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
  let badgeXp = 0;
  for (const badgeId of shouldHave) {
    if (!existingBadgeIds.has(badgeId)) {
      await supabase.from("user_badges").insert({ user_id: user.id, badge_id: badgeId });
      newBadges.push(badgeId);
      badgeXp += XP_REWARDS.badge;
    }
  }

  if (badgeXp > 0) {
    xpEarned += badgeXp;
    currentXp += badgeXp;

    await supabase.from("profiles").update({ xp: currentXp }).eq("id", user.id);
  }

  return NextResponse.json({
    success: true,
    streak: stats.streak,
    bestStreak: stats.bestStreak,
    totalCheckins: stats.totalCheckins,
    totalTalked: stats.totalTalked,
    approachRate: stats.approachRate,
    totalOpportunities: stats.totalOpportunities,
    totalApproaches: stats.totalApproaches,
    totalSuccesses: stats.totalSuccesses,
    totalFailures: stats.totalFailures,
    totalDidntApproach: stats.totalDidntApproach,
    successRate: stats.successRate,
    approachConversionRate: stats.approachConversionRate,
    xp: currentXp,
    xpEarned,
    newBadges,
    streakFreezes: currentFreezes,
  });
}

// PATCH — edit stats for a specific day, or adjust totals
export async function PATCH(req: Request) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Mode 1: edit a specific day's stats
  if (body.date !== undefined) {
    const { date, opportunities, approaches, successes } = body;
    const opps = Math.max(0, opportunities ?? 0);
    const appr = Math.max(0, Math.min(opps, approaches ?? 0));
    const succ = Math.max(0, Math.min(appr, successes ?? 0));

    const { data: existing } = await supabase
      .from("checkins").select("id").eq("user_id", user.id).eq("checked_in_at", date).single();

    if (existing) {
      await supabase.from("checkins").update({
        opportunities_count: opps,
        approaches_count: appr,
        successes_count: succ,
        talked: appr > 0,
      }).eq("user_id", user.id).eq("checked_in_at", date);
    } else {
      await supabase.from("checkins").insert({
        user_id: user.id,
        checked_in_at: date,
        talked: appr > 0,
        opportunities_count: opps,
        approaches_count: appr,
        successes_count: succ,
      });
    }

    const stats = await getFullStats(supabase, user.id);
    return NextResponse.json({
      totalOpportunities: stats.totalOpportunities,
      totalApproaches: stats.totalApproaches,
      totalSuccesses: stats.totalSuccesses,
      totalFailures: stats.totalFailures,
      totalDidntApproach: stats.totalDidntApproach,
      successRate: stats.successRate,
      approachConversionRate: stats.approachConversionRate,
      totalTalked: stats.totalTalked,
      approachRate: stats.approachRate,
      history: stats.history,
    });
  }

  return NextResponse.json({ error: "Missing fields" }, { status: 400 });
}
