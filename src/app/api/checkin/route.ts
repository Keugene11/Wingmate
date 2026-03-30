import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { applyXp, computeLevelFromTotal, getLevelInfo, getXpToNextLevel, getXpForCurrentLevel } from "@/lib/levels";

function computeStreak(dates: string[], clientToday?: string): number {
  if (dates.length === 0) return 0;
  const today = clientToday ? new Date(clientToday + "T12:00:00") : new Date();
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

function computeConsecutiveApproaches(checkins: { talked: boolean }[] | any[]): number {
  let count = 0;
  for (const c of checkins) {
    if (c.talked) count++;
    else break;
  }
  return count;
}

async function getFullStats(userId: string, clientToday?: string) {
  const allCheckins = await sql`
    SELECT checked_in_at, talked, opportunities_count, approaches_count, successes_count
    FROM checkins
    WHERE user_id = ${userId}
    ORDER BY checked_in_at DESC
  `;

  const checkins = allCheckins || [];
  const dates = checkins.map((c: any) => c.checked_in_at);
  const streak = computeStreak(dates, clientToday);
  const bestStreak = Math.max(computeBestStreak(dates), streak);
  const totalCheckins = checkins.length;
  const totalTalked = checkins.filter((c: any) => c.talked).length;
  const approachRate = totalCheckins > 0 ? Math.round((totalTalked / totalCheckins) * 100) : 0;
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
  const baseDate = clientToday ? new Date(clientToday + "T12:00:00") : new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
    opportunities: c.opportunities_count || 0,
    approaches: c.approaches_count || 0,
    successes: c.successes_count || 0,
  }));

  return {
    checkins, dates, streak, bestStreak, totalCheckins, totalTalked,
    approachRate, consecutiveApproaches, last7,
    last7AllCheckedIn, weekendApproaches, history,
    totalOpportunities, totalApproaches, totalSuccesses, totalFailures,
    totalDidntApproach, successRate, approachConversionRate,
  };
}

// GET
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const url = new URL(req.url);
  const today = url.searchParams.get("today") || new Date().toISOString().split("T")[0];

  const todayRows = await sql`
    SELECT * FROM checkins WHERE user_id = ${userId} AND checked_in_at = ${today} LIMIT 1
  `;
  const todayCheckin = todayRows[0] || null;

  const stats = await getFullStats(userId, today);

  // Get profile for freezes, weekly goal, and level
  const profileRows = await sql`
    SELECT streak_freezes, weekly_approach_goal, level, xp FROM profiles WHERE id = ${userId} LIMIT 1
  `;
  const profile = profileRows[0] || null;

  // XP is cumulative (total approaches). Derive level from it.
  const totalXp = profile?.xp ?? 0;
  const { level } = computeLevelFromTotal(totalXp);
  const levelInfo = getLevelInfo(level);
  const xpToNextLevel = getXpToNextLevel(level);
  const xpForCurrentLevel = getXpForCurrentLevel(level);

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
    weeklyApproaches: stats.last7.reduce((sum: number, d: { approaches: number }) => sum + d.approaches, 0),
    weeklyApproachGoal: profile?.weekly_approach_goal ?? 0,
    streakFreezes: profile?.streak_freezes ?? 0,
    level,
    xp: totalXp,
    levelName: levelInfo.name,
    xpToNextLevel,
    xpForCurrentLevel,
  });
}

// POST
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await req.json();
  const { talked, opportunitiesCount, approachesCount, successesCount, clientDate } = body;
  const note = body.note ? String(body.note).trim().slice(0, 500) : null;
  const today = clientDate || new Date().toISOString().split("T")[0];

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today) || isNaN(new Date(today + "T00:00:00").getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  // Reject future dates
  const todayDate = new Date(today + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (todayDate.getTime() > now.getTime() + 86400000) {
    return NextResponse.json({ error: "Cannot check in for future dates" }, { status: 400 });
  }

  // Clamp counts: non-negative, approaches <= opportunities, successes <= approaches
  const opps = Math.min(9999, Math.max(0, opportunitiesCount ?? 0));
  const appr = Math.min(opps, Math.max(0, approachesCount ?? (talked ? 1 : 0)));
  const succ = Math.min(appr, Math.max(0, successesCount ?? 0));

  // Check if this is a new check-in or update
  const existingRows = await sql`
    SELECT id, approaches_count FROM checkins WHERE user_id = ${userId} AND checked_in_at = ${today} LIMIT 1
  `;
  const existing = existingRows[0] || null;
  const isNew = !existing;

  try {
    if (existing) {
      await sql`
        UPDATE checkins SET
          talked = ${talked},
          note = ${note},
          opportunities_count = ${opps},
          approaches_count = ${appr},
          successes_count = ${succ}
        WHERE user_id = ${userId} AND checked_in_at = ${today}
      `;
    } else {
      await sql`
        INSERT INTO checkins (user_id, talked, note, checked_in_at, opportunities_count, approaches_count, successes_count)
        VALUES (${userId}, ${talked}, ${note}, ${today}, ${opps}, ${appr}, ${succ})
      `;
    }
  } catch (err: any) {
    console.error("[POST] checkin error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  const stats = await getFullStats(userId, today);

  // Get profile for streak freezes and level
  const profileRows = await sql`
    SELECT streak_freezes, level, xp FROM profiles WHERE id = ${userId} LIMIT 1
  `;
  let profile = profileRows[0] || null;

  if (!profile) {
    await sql`
      INSERT INTO profiles (id, username, streak_freezes, level, xp)
      VALUES (${userId}, '', 0, 1, 0)
      ON CONFLICT (id) DO NOTHING
    `;
    profile = { streak_freezes: 0, level: 1, xp: 0 };
  }

  let currentFreezes = profile.streak_freezes || 0;

  // Award streak freeze every 7 days (only for new check-ins)
  if (isNew && stats.streak > 0 && stats.streak % 7 === 0) {
    currentFreezes = Math.min(currentFreezes + 1, 3);
  }

  // Compute XP delta: 1 XP per approach
  const previousApproaches = existing?.approaches_count ?? 0;
  const approachDelta = appr - previousApproaches;

  let currentLevel = profile.level || 1;
  let currentXp = profile.xp || 0;
  let leveledUp = false;
  let newLevelName: string | null = null;

  if (approachDelta > 0) {
    const result = applyXp(currentLevel, currentXp, approachDelta);
    currentLevel = result.level;
    currentXp = result.xp;
    leveledUp = result.leveledUp;
    newLevelName = result.newLevelName;
  } else if (approachDelta < 0) {
    // User reduced approaches — recompute from total
    const recomputed = computeLevelFromTotal(stats.totalApproaches);
    currentLevel = recomputed.level;
    currentXp = recomputed.xp;
  }

  // Save profile updates
  await sql`
    UPDATE profiles SET streak_freezes = ${currentFreezes}, level = ${currentLevel}, xp = ${currentXp}
    WHERE id = ${userId}
  `;

  const levelInfo = getLevelInfo(currentLevel);
  const xpToNextLevel = getXpToNextLevel(currentLevel);
  const xpForCurrentLevel = getXpForCurrentLevel(currentLevel);

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
    streakFreezes: currentFreezes,
    level: currentLevel,
    xp: currentXp,
    levelName: levelInfo.name,
    xpToNextLevel,
    xpForCurrentLevel,
    leveledUp,
    newLevelName,
  });
}

// PATCH — edit stats for a specific day, or adjust totals
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await req.json();

  // Mode 1: edit a specific day's stats
  if (body.date !== undefined) {
    const { date, opportunities, approaches, successes } = body;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(new Date(date + "T00:00:00").getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const opps = Math.min(9999, Math.max(0, opportunities ?? 0));
    const appr = Math.min(opps, Math.max(0, approaches ?? 0));
    const succ = Math.min(appr, Math.max(0, successes ?? 0));

    const existingRows = await sql`
      SELECT id FROM checkins WHERE user_id = ${userId} AND checked_in_at = ${date} LIMIT 1
    `;
    const existing = existingRows[0] || null;

    try {
      if (existing) {
        await sql`
          UPDATE checkins SET
            opportunities_count = ${opps},
            approaches_count = ${appr},
            successes_count = ${succ},
            talked = ${appr > 0}
          WHERE user_id = ${userId} AND checked_in_at = ${date}
        `;
      } else {
        await sql`
          INSERT INTO checkins (user_id, checked_in_at, talked, opportunities_count, approaches_count, successes_count)
          VALUES (${userId}, ${date}, ${appr > 0}, ${opps}, ${appr}, ${succ})
        `;
      }
    } catch (err: any) {
      console.error("[PATCH] checkin error:", err);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }

    const stats = await getFullStats(userId, date);

    // Recompute level from total approaches after edit
    const recomputed = computeLevelFromTotal(stats.totalApproaches);
    await sql`
      UPDATE profiles SET level = ${recomputed.level}, xp = ${recomputed.xp}
      WHERE id = ${userId}
    `;

    const levelInfo = getLevelInfo(recomputed.level);
    const xpToNextLevel = getXpToNextLevel(recomputed.level);
    const xpForCurrentLevel = getXpForCurrentLevel(recomputed.level);

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
      level: recomputed.level,
      xp: recomputed.xp,
      levelName: levelInfo.name,
      xpToNextLevel,
      xpForCurrentLevel,
    });
  }

  return NextResponse.json({ error: "Missing fields" }, { status: 400 });
}
