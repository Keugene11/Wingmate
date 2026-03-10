// === XP & LEVELS ===

export const XP_REWARDS = {
  checkin: 10,
  approach: 25, // talked = true
  note: 5,
  streakBonus: (streak: number) => Math.min(streak * 2, 50), // up to +50 bonus per day
  badge: 50,
};

export interface Level {
  level: number;
  title: string;
  xpRequired: number;
}

export const LEVELS: Level[] = [
  { level: 1, title: "Observer", xpRequired: 0 },
  { level: 2, title: "Curious", xpRequired: 50 },
  { level: 3, title: "Brave", xpRequired: 120 },
  { level: 5, title: "Ice Breaker", xpRequired: 250 },
  { level: 7, title: "Conversation Starter", xpRequired: 500 },
  { level: 10, title: "Social Explorer", xpRequired: 800 },
  { level: 13, title: "Confident", xpRequired: 1200 },
  { level: 15, title: "Bold", xpRequired: 1800 },
  { level: 18, title: "Fearless", xpRequired: 2500 },
  { level: 20, title: "Confident Connector", xpRequired: 3500 },
  { level: 25, title: "Social Magnet", xpRequired: 5000 },
  { level: 30, title: "Approach Master", xpRequired: 8000 },
  { level: 40, title: "Legend", xpRequired: 15000 },
];

export function getLevelInfo(xp: number): { current: Level; next: Level | null; progress: number } {
  let current = LEVELS[0];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xpRequired) {
      current = LEVELS[i];
      break;
    }
  }
  const nextIdx = LEVELS.indexOf(current) + 1;
  const next = nextIdx < LEVELS.length ? LEVELS[nextIdx] : null;
  const progress = next
    ? (xp - current.xpRequired) / (next.xpRequired - current.xpRequired)
    : 1;
  return { current, next, progress: Math.min(1, Math.max(0, progress)) };
}

// === BADGES ===

export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji
  category: "streak" | "volume" | "consistency" | "special";
}

export const BADGES: BadgeDef[] = [
  // Special
  { id: "first_step", name: "First Step", description: "Complete your first check-in", icon: "👣", category: "special" },
  { id: "comeback_kid", name: "Comeback Kid", description: "Return after 7+ days away", icon: "🔄", category: "special" },
  { id: "note_taker", name: "Note Taker", description: "Write 10 journal notes", icon: "📝", category: "special" },
  { id: "ice_breaker", name: "Ice Breaker", description: "Talk to someone on your first day", icon: "🧊", category: "special" },

  // Streak
  { id: "streak_3", name: "Getting Started", description: "3-day streak", icon: "🔥", category: "streak" },
  { id: "streak_7", name: "Week Warrior", description: "7-day streak", icon: "⚡", category: "streak" },
  { id: "streak_14", name: "Two Weeks Strong", description: "14-day streak", icon: "💪", category: "streak" },
  { id: "streak_30", name: "Monthly Master", description: "30-day streak", icon: "👑", category: "streak" },
  { id: "streak_60", name: "Unstoppable", description: "60-day streak", icon: "🏆", category: "streak" },
  { id: "streak_100", name: "Century", description: "100-day streak", icon: "💯", category: "streak" },

  // Volume
  { id: "approaches_5", name: "High Five", description: "5 total approaches", icon: "🖐️", category: "volume" },
  { id: "approaches_10", name: "Double Digits", description: "10 total approaches", icon: "🎯", category: "volume" },
  { id: "approaches_25", name: "Quarter Century", description: "25 total approaches", icon: "🌟", category: "volume" },
  { id: "approaches_50", name: "Fifty and Fearless", description: "50 total approaches", icon: "🚀", category: "volume" },
  { id: "approaches_100", name: "The Hundred Club", description: "100 total approaches", icon: "💎", category: "volume" },

  // Consistency
  { id: "full_week", name: "Perfect Week", description: "Check in all 7 days of a week", icon: "📅", category: "consistency" },
  { id: "weekend_warrior", name: "Weekend Warrior", description: "Approach on both Saturday and Sunday", icon: "🎉", category: "consistency" },
  { id: "hot_streak", name: "Hot Streak", description: "5 approaches in a row", icon: "🔥", category: "consistency" },
];

export function getBadgeById(id: string): BadgeDef | undefined {
  return BADGES.find((b) => b.id === id);
}

// Compute which badges should be earned based on stats
export function computeEarnedBadges(stats: {
  totalCheckins: number;
  totalTalked: number;
  currentStreak: number;
  bestStreak: number;
  notesWritten: number;
  daysSinceLastCheckin: number;
  isFirstCheckin: boolean;
  talkedToday: boolean;
  last7AllCheckedIn: boolean;
  weekendApproaches: boolean; // both sat+sun this week
  consecutiveApproaches: number; // current run of talked=true
}): string[] {
  const earned: string[] = [];

  // Special
  if (stats.isFirstCheckin) earned.push("first_step");
  if (stats.daysSinceLastCheckin >= 7 && !stats.isFirstCheckin) earned.push("comeback_kid");
  if (stats.notesWritten >= 10) earned.push("note_taker");
  if (stats.isFirstCheckin && stats.talkedToday) earned.push("ice_breaker");

  // Streak
  if (stats.currentStreak >= 3) earned.push("streak_3");
  if (stats.currentStreak >= 7) earned.push("streak_7");
  if (stats.currentStreak >= 14) earned.push("streak_14");
  if (stats.currentStreak >= 30) earned.push("streak_30");
  if (stats.currentStreak >= 60) earned.push("streak_60");
  if (stats.currentStreak >= 100) earned.push("streak_100");

  // Volume
  if (stats.totalTalked >= 5) earned.push("approaches_5");
  if (stats.totalTalked >= 10) earned.push("approaches_10");
  if (stats.totalTalked >= 25) earned.push("approaches_25");
  if (stats.totalTalked >= 50) earned.push("approaches_50");
  if (stats.totalTalked >= 100) earned.push("approaches_100");

  // Consistency
  if (stats.last7AllCheckedIn) earned.push("full_week");
  if (stats.weekendApproaches) earned.push("weekend_warrior");
  if (stats.consecutiveApproaches >= 5) earned.push("hot_streak");

  return earned;
}

// === STREAK FLAME TIERS ===

export function getFlameLevel(streak: number): { tier: string; color: string; bgColor: string; size: number } {
  if (streak >= 30) return { tier: "inferno", color: "text-white", bgColor: "bg-gradient-to-br from-orange-500 to-red-600", size: 36 };
  if (streak >= 14) return { tier: "blaze", color: "text-white", bgColor: "bg-orange-500", size: 32 };
  if (streak >= 7) return { tier: "flame", color: "text-white", bgColor: "bg-orange-400", size: 30 };
  if (streak >= 3) return { tier: "spark", color: "text-orange-600", bgColor: "bg-orange-100", size: 28 };
  return { tier: "ember", color: "text-orange-500", bgColor: "bg-orange-50", size: 26 };
}
