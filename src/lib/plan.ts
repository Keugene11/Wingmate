// 4-week rizz plan. Static structure, but every line is written against the
// user's own onboarding answers: weekly target, blocker, status, location,
// and goal. No generic "Eye Contact" labels — the plan speaks in their
// numbers and in their language.

export type PlanLocation = "city" | "suburb" | "town" | "rural";
export type PlanStatus = "student" | "working" | "other";
export type PlanBlocker = "rejection" | "words" | "confidence" | "time";

export type PlanProfile = {
  status: string | null;
  location: string | null;
  blocker: string | null;
  goal: string | null; // comma-separated ids, e.g. "girlfriend,rizz"
  weekly_approach_goal: number | null;
};

export type PlanWeek = {
  number: 1 | 2 | 3 | 4;
  heading: string;
  why: string; // may contain \n\n for paragraph breaks
  tasks: string[];
  endOfWeek: string;
};

export type PlanState = {
  currentWeek: 1 | 2 | 3 | 4;
  daysIntoWeek: number; // 0-6
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

function weeklyTarget(profile: PlanProfile): number {
  const t = profile.weekly_approach_goal;
  if (typeof t === "number" && t > 0) return t;
  return 5;
}

function spotsFor(profile: PlanProfile): string {
  const { status, location } = profile;
  if (status === "student") return "campus — the library café, the student union, between classes";
  if (status === "working") {
    if (location === "city") return "the lunch spots near your office, after-work cafés, the gym";
    if (location === "suburb") return "the grocery store, the gym, the coffee shop on your commute";
    return "the handful of places you go in a normal week — make every trip count";
  }
  if (location === "city") return "coffee shops, busy streets, the gym";
  if (location === "suburb") return "the mall, the grocery store, the gym";
  if (location === "town") return "your regular spots — the café, the gym, the bookstore";
  if (location === "rural") return "the few spots you do go to — don't wait for the perfect moment";
  return "the spots you're already at every week";
}

function blockerAddress(blocker: string | null): string {
  switch (blocker) {
    case "rejection":
      return "Fear of rejection is your block — so forget outcomes. Every attempt is the win.";
    case "words":
      return "You never know what to say — so don't try to. \"Hey, how's your day going\" works.";
    case "confidence":
      return "Low confidence is the block — you won't feel ready. Act first, confidence follows.";
    case "time":
      return "You can't find the right moment — so don't wait for one. First 10 seconds or it doesn't happen.";
    default:
      return "You're here to make more moves. That's the first rep.";
  }
}

function goalLine(goal: string | null): string {
  const goals = (goal || "").split(",").filter(Boolean);
  if (goals.includes("girlfriend")) return "You want a girlfriend — close only with the ones who actually spark something.";
  if (goals.includes("hookups")) return "You're playing the dating game — match her energy and escalate.";
  if (goals.includes("rizz")) return "You're building rizz — the ask is the rep that matters most.";
  if (goals.includes("memories")) return "You want memories — made by the moments you said yes to.";
  return "Every closed loop is proof you can do this.";
}

export function buildWeek(weekNum: 1 | 2 | 3 | 4, profile: PlanProfile): PlanWeek {
  const weekly = weeklyTarget(profile);
  const daily = Math.max(1, Math.round(weekly / 7));
  const halfWeekly = Math.max(1, Math.round(weekly / 2));
  const halfDaily = Math.max(1, Math.round(halfWeekly / 7));
  const spots = spotsFor(profile);

  if (weekNum === 1) {
    return {
      number: 1,
      heading: "Build the habit",
      why: `${blockerAddress(profile.blocker)} Target ${weekly}/week — this week we ramp at half.`,
      tasks: [
        `${halfDaily} ${halfDaily === 1 ? "approach" : "approaches"} a day · ${halfWeekly}/week`,
        `Stay in your lane: ${spots.split(" — ")[0]}`,
        `Count attempts, not outcomes`,
      ],
      endOfWeek: `${halfWeekly} attempts logged.`,
    };
  }

  if (weekNum === 2) {
    return {
      number: 2,
      heading: "Hit your number",
      why: `Warmup's over. Target — ${weekly} approaches. Prove the number wasn't a fantasy.`,
      tasks: [
        `${daily} a day · ${weekly}/week`,
        `Same spots, different faces`,
        profile.blocker === "time" ? "Use time you already have — café lines, commutes" : "Leaving after the opener still counts",
      ],
      endOfWeek: `${weekly} approaches, hit clean.`,
    };
  }

  if (weekNum === 3) {
    return {
      number: 3,
      heading: "Go deeper",
      why: `Past "can I even do this." Stretch — same ${weekly}, but stick around on half.`,
      tasks: [
        `${daily} a day · ${weekly}/week`,
        `Carry 60+ seconds on half. One follow-up, one thing about you`,
        `Clean exit: "Anyway, I gotta run"`,
      ],
      endOfWeek: "One 2-minute conversation that doesn't feel forced.",
    };
  }

  // Week 4
  return {
    number: 4,
    heading: "Close the loop",
    why: `Stop walking away empty-handed. ${goalLine(profile.goal)}`,
    tasks: [
      `${daily} a day · ${weekly}/week`,
      `1 ask a day: "I gotta go but you seem cool — what's your IG?"`,
      `If no, clean exit. No wounded energy`,
    ],
    endOfWeek: "One closed loop — ghost or not, you closed.",
  };
}
