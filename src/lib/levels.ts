export const LEVELS = [
  { level: 1, name: "Noob", totalRequired: 0 },
  { level: 2, name: "Beginner", totalRequired: 3 },
  { level: 3, name: "Novice", totalRequired: 10 },
  { level: 4, name: "Casual Cold Approacher", totalRequired: 20 },
  { level: 5, name: "Advanced Cold Approacher", totalRequired: 50 },
  { level: 6, name: "God Cold Approacher", totalRequired: 100 },
] as const;

export const MAX_LEVEL = 6;

/** Get level info by level number */
export function getLevelInfo(level: number) {
  return LEVELS.find((l) => l.level === level) ?? LEVELS[0];
}

/**
 * Compute level and progress from total XP (total approaches).
 * XP is cumulative — it never resets.
 */
export function computeLevelFromTotal(totalXp: number): { level: number; xp: number } {
  let level = 1;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVELS[i].totalRequired) {
      level = LEVELS[i].level;
      break;
    }
  }
  return { level, xp: totalXp };
}

/**
 * XP needed to reach the next level (cumulative threshold).
 * Returns 0 if already at max level.
 */
export function getXpToNextLevel(level: number): number {
  const next = LEVELS.find((l) => l.level === level + 1);
  return next ? next.totalRequired : 0;
}

/**
 * XP threshold for the current level (where this level starts).
 */
export function getXpForCurrentLevel(level: number): number {
  const info = LEVELS.find((l) => l.level === level);
  return info ? info.totalRequired : 0;
}

/**
 * Apply an XP delta to the current total XP.
 * Returns new level, total xp, and whether a level-up occurred.
 */
export function applyXp(
  currentLevel: number,
  currentXp: number,
  delta: number
): { level: number; xp: number; leveledUp: boolean; newLevelName: string | null } {
  if (delta <= 0) {
    return { level: currentLevel, xp: currentXp, leveledUp: false, newLevelName: null };
  }

  const newXp = currentXp + delta;
  const { level: newLevel } = computeLevelFromTotal(newXp);
  const leveledUp = newLevel > currentLevel;
  const newLevelName = leveledUp ? getLevelInfo(newLevel).name : null;

  return { level: newLevel, xp: newXp, leveledUp, newLevelName };
}
