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
      return "You said fear of rejection is what stops you. Forget the outcome — every attempt IS the win. She doesn't owe you a conversation. You owe yourself the rep.";
    case "words":
      return "You said you never know what to say. You don't need a script. \"Hey, how's your day going?\" has worked for every guy in history. Use the words that are already in your mouth.";
    case "confidence":
      return "You said low confidence is holding you back. You're not going to feel ready. The guy who waits to feel ready never goes. Act first, confidence comes after.";
    case "time":
      return "You said you can never find the right moment. There isn't one. Make the move in the first 10 seconds or you'll talk yourself out of it.";
    default:
      return "You're here because you want to make more moves. That's the first rep.";
  }
}

function goalLine(goal: string | null): string {
  const goals = (goal || "").split(",").filter(Boolean);
  if (goals.includes("girlfriend")) return "You said you want a girlfriend — so don't waste the ask on every girl you talk to. Close the loop with the ones who actually spark something.";
  if (goals.includes("hookups")) return "You said you're in it for the dating game. Read her energy. If she's giving it back, match and escalate.";
  if (goals.includes("rizz")) return "You said you're working on rizz. The ask is the rep that builds the skill — treat it like a set, not a verdict.";
  if (goals.includes("memories")) return "You said you just want great memories. That's made by the moments you said yes to, not the ones you dodged.";
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
      why: `${blockerAddress(profile.blocker)}\n\nYou told us you want to talk to ${weekly} girls a week. This week we're not there yet — we're ramping. Half the volume, full commitment.`,
      tasks: [
        `${halfDaily} ${halfDaily === 1 ? "approach" : "approaches"} a day — ${halfWeekly} for the week`,
        `Do them at ${spots}`,
        `Count attempts, not outcomes. Every "hey" is a rep, even if she barely responds`,
      ],
      endOfWeek: `${halfWeekly} attempts logged. Hit that and Week 2 is just volume.`,
    };
  }

  if (weekNum === 2) {
    const timeNudge = profile.blocker === "time"
      ? "Use the time you already have — the line at the café, the walk between classes, the grocery run."
      : "You're allowed to leave right after the opener. A 'hi' still counts.";
    return {
      number: 2,
      heading: "Hit your number",
      why: `Last week was the warmup. This week is your actual target — ${weekly} approaches. You set the number; time to prove it wasn't a fantasy.`,
      tasks: [
        `${daily} ${daily === 1 ? "approach" : "approaches"} a day, ${weekly} for the week`,
        `Lean on routine. Same ${spots.split(" — ")[0]} — different faces`,
        timeNudge,
      ],
      endOfWeek: `${weekly} approaches. Your number, hit clean.`,
    };
  }

  if (weekNum === 3) {
    return {
      number: 3,
      heading: "Go deeper",
      why: `You're past "can I even do this." Now we stretch — same ${weekly} approaches, but on at least half of them, actually stick around.`,
      tasks: [
        `Keep your ${daily}-a-day pace — ${weekly} for the week`,
        `On half of them, hold a 60+ second conversation. Ask one follow-up. Listen to her answer`,
        `Practice the exit: "Anyway, I gotta run — was good talking." Say it and mean it`,
      ],
      endOfWeek: "One 2-minute conversation that doesn't feel forced.",
    };
  }

  // Week 4
  return {
    number: 4,
    heading: "Close the loop",
    why: `You're not walking away empty-handed anymore.\n\n${goalLine(profile.goal)}`,
    tasks: [
      `Keep ${daily} a day — ${weekly} for the week`,
      `1 ask per day for an Instagram or number. Exact line: "I gotta go but you seem cool — what's your Instagram?"`,
      `If she says no: "all good, have a great one" — walk. Clean exit, no wounded energy`,
    ],
    endOfWeek: "One closed loop this week. Whether she replies or ghosts doesn't matter — you closed.",
  };
}
