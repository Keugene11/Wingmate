// The Plan is the card the user opens when they see a girl and freeze.
// 5-second read. Punchy lines, not paragraphs.

export type PlanLocation = "city" | "suburb" | "town" | "rural";
export type PlanStatus = "student" | "working" | "other";
export type PlanBlocker = "rejection" | "words" | "confidence" | "time";

export type PlanProfile = {
  status: string | null;
  location: string | null;
  blocker: string | null;
  goal: string | null;
  custom_goal: string | null;
  weekly_approach_goal: number | null;
  plan_note: string | null;
};

export type PlanMotivation = {
  goalLabels: string[];
  blockerLabel: string | null;
  focus: string | null;
  weeklyTarget: number;
};

export const GOAL_LABELS: Record<string, string> = {
  girlfriend: "Get a girlfriend",
  rizz: "Improve my rizz",
  memories: "Make fun memories",
  hookups: "Meet more people & date casually",
};

export const BLOCKER_LABELS: Record<string, string> = {
  rejection: "Fear of rejection",
  words: "Don't know what to say",
  confidence: "Low confidence",
  time: "Never the right moment",
};

export type PlanState = {
  currentWeek: 1 | 2 | 3 | 4;
  daysIntoWeek: number;
  graduated: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function derivePlanState(createdAt: string | Date | null | undefined): PlanState {
  if (!createdAt) return { currentWeek: 1, daysIntoWeek: 0, graduated: false };
  const start = createdAt instanceof Date ? createdAt.getTime() : new Date(createdAt).getTime();
  if (Number.isNaN(start)) return { currentWeek: 1, daysIntoWeek: 0, graduated: false };
  const daysSince = Math.max(0, Math.floor((Date.now() - start) / DAY_MS));
  const rawWeek = Math.floor(daysSince / 7) + 1;
  const currentWeek = Math.min(4, Math.max(1, rawWeek)) as 1 | 2 | 3 | 4;
  return {
    currentWeek,
    daysIntoWeek: daysSince % 7,
    graduated: rawWeek > 4,
  };
}

export function buildMotivation(profile: PlanProfile): PlanMotivation {
  const ids = (profile.goal || "").split(",").filter(Boolean);
  const goalLabels = ids.map((id) => GOAL_LABELS[id]).filter(Boolean);
  const custom = (profile.custom_goal || "").trim();
  if (custom) goalLabels.push(custom);

  const blockerLabel = profile.blocker ? BLOCKER_LABELS[profile.blocker] ?? null : null;
  const raw = profile.weekly_approach_goal;

  return {
    goalLabels,
    blockerLabel,
    focus: (profile.plan_note || "").trim() || null,
    weeklyTarget: typeof raw === "number" && raw > 0 ? raw : 5,
  };
}
