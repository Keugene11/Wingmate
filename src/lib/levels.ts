export const LEVELS = [
  { level: 1, name: "Noob", xpRequired: 0 },
  { level: 2, name: "Beginner", xpRequired: 3 },
  { level: 3, name: "Novice", xpRequired: 5 },
  { level: 4, name: "Casual Cold Approacher", xpRequired: 10 },
  { level: 5, name: "Advanced Cold Approacher", xpRequired: 20 },
  { level: 6, name: "God Cold Approacher", xpRequired: 50 },
] as const;

export const MAX_LEVEL = 6;

/** Get level info by level number */
export function getLevelInfo(level: number) {
  return LEVELS.find((l) => l.level === level) ?? LEVELS[0];
}

/** XP needed to reach the next level from the current one. 0 if max. */
export function getXpToNextLevel(level: number): number {
  const next = LEVELS.find((l) => l.level === level + 1);
  return next ? next.xpRequired : 0;
}

/**
 * Given a total number of approaches, compute current level and XP within that level.
 * Used for backfill and for computing level from scratch.
 */
export function computeLevelFromTotal(totalApproaches: number): { level: number; xp: number } {
  let remaining = totalApproaches;

  for (let i = 1; i < LEVELS.length; i++) {
    const needed = LEVELS[i].xpRequired;
    if (remaining < needed) {
      return { level: LEVELS[i - 1].level, xp: remaining };
    }
    remaining -= needed;
  }

  // Max level — xp is capped at the last level's requirement
  return { level: MAX_LEVEL, xp: LEVELS[LEVELS.length - 1].xpRequired };
}

/**
 * Apply an XP delta (from new approaches) to the current level/xp.
 * Returns new level, xp, and whether a level-up occurred.
 */
export function applyXp(
  currentLevel: number,
  currentXp: number,
  delta: number
): { level: number; xp: number; leveledUp: boolean; newLevelName: string | null } {
  if (delta <= 0 || currentLevel >= MAX_LEVEL) {
    return { level: currentLevel, xp: currentXp, leveledUp: false, newLevelName: null };
  }

  let level = currentLevel;
  let xp = currentXp + delta;
  let leveledUp = false;
  let newLevelName: string | null = null;

  while (level < MAX_LEVEL) {
    const needed = getXpToNextLevel(level);
    if (needed === 0 || xp < needed) break;
    xp -= needed;
    level++;
    leveledUp = true;
    newLevelName = getLevelInfo(level).name;
  }

  // Cap XP at max level's requirement
  if (level >= MAX_LEVEL) {
    xp = Math.min(xp, LEVELS[LEVELS.length - 1].xpRequired);
  }

  return { level, xp, leveledUp, newLevelName };
}
