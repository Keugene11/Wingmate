import type { Page } from "@playwright/test";

/**
 * Shared demo data + route-mocking for Play Store screenshot tests.
 * Lets the app render as a signed-in Pro user with realistic content
 * without needing a real test account.
 */

const DEMO_USER = {
  id: "demo-user",
  name: "Alex",
  email: "alex@demo.live",
  image: null,
};

export const SESSION_RESPONSE = {
  user: DEMO_USER,
  expires: "2099-01-01T00:00:00.000Z",
};

export const PROFILE_RESPONSE = {
  profile: {
    status: "working",
    location: "city",
    blocker: "rejection",
    goal: "girlfriend",
    custom_goal: null,
    weekly_approach_goal: 5,
    plan_note: "Say hi to the girl at my gym before Friday",
    created_at: new Date(Date.now() - 12 * 24 * 3600 * 1000).toISOString(),
  },
  isPro: true,
};

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const CHECKIN_RESPONSE = {
  checkedInToday: true,
  talked: true,
  opportunitiesCount: 3,
  approachesCount: 3,
  successesCount: 1,
  streak: 12,
  bestStreak: 14,
  totalCheckins: 18,
  totalTalked: 14,
  approachRate: 0.78,
  totalOpportunities: 47,
  totalApproaches: 47,
  totalSuccesses: 12,
  totalFailures: 35,
  totalDidntApproach: 4,
  successRate: 0.26,
  approachConversionRate: 0.78,
  last7: [
    { date: daysAgo(6), talked: true, approaches: 2 },
    { date: daysAgo(5), talked: true, approaches: 3 },
    { date: daysAgo(4), talked: false, approaches: 0 },
    { date: daysAgo(3), talked: true, approaches: 4 },
    { date: daysAgo(2), talked: true, approaches: 2 },
    { date: daysAgo(1), talked: true, approaches: 5 },
    { date: daysAgo(0), talked: true, approaches: 3 },
  ],
  history: [],
  streakFreezes: 2,
  weeklyApproaches: 4,
  weeklyApproachGoal: 5,
  level: 4,
  xp: 340,
  levelName: "Rizzler",
  xpToNextLevel: 500,
  xpForCurrentLevel: 250,
};

export const CONVERSATIONS_RESPONSE = [
  { id: "demo-convo-1", title: "Girl at the coffee shop", updated_at: new Date().toISOString() },
  { id: "demo-convo-2", title: "Nervous about gym crush", updated_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString() },
];

export const MESSAGES_RESPONSE = {
  messages: [
    { role: "user", content: "She's right across from me at the coffee shop. What do I say??" },
    { role: "assistant", content: "Go NOW bro. 10 seconds of courage." },
    { role: "assistant", content: "Walk over. Eye contact. \"Hey — quick question, what are you reading?\" That's it. Keep it short." },
    { role: "user", content: "It worked. Got her number 🔥" },
    { role: "assistant", content: "LET'S GOOOO KING 👑" },
  ],
};

export const USAGE_RESPONSE = { messagesToday: 3, sessionsToday: 1, limit: null };

export const COMMUNITY_POSTS = {
  posts: [
    {
      id: "p1",
      title: "First real approach today 🎉",
      body: "Been using Wingmate for two weeks. Finally went up to the girl at my gym and just said hi. She smiled and we talked for 10 minutes. Still can't believe I did it.",
      author_name: "Marcus",
      created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      upvotes: 67,
      comment_count: 14,
      user_vote: 0,
    },
    {
      id: "p2",
      title: "How do you recover after getting rejected?",
      body: "Got shut down pretty hard yesterday. What do you guys do to reset and not let it kill your confidence for the rest of the week?",
      author_name: "Jay",
      created_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
      upvotes: 41,
      comment_count: 23,
      user_vote: 1,
    },
    {
      id: "p3",
      title: "12-day streak — the momentum is real",
      body: "Didn't think a tracker would change much but checking in every day actually makes me follow through. Highly recommend setting a weekly goal.",
      author_name: "Dev",
      created_at: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
      upvotes: 52,
      comment_count: 9,
      user_vote: 0,
    },
  ],
  hasMore: false,
};

export const PLAN_COUNTS = { monthly: 1284, yearly: 3967 };
// page.tsx + community pages check `d.subscribed` — NOT `isPro`. Using the
// wrong field causes the gate at page.tsx:206 to redirect to /onboarding.
// `current_period_end` is rendered on the plans page as "Renews <date>".
export const STRIPE_STATUS = {
  subscribed: true,
  subscription: {
    status: "active",
    current_period_end: new Date(Date.now() + 28 * 24 * 3600 * 1000).toISOString(),
  },
};

const json = (body: unknown) => ({
  status: 200,
  contentType: "application/json",
  body: JSON.stringify(body),
});

export type MockOptions = { signedIn?: boolean };

export async function installMocks(page: Page, opts: MockOptions = {}) {
  const signedIn = opts.signedIn ?? true;

  await page.route(/\/api\/auth\/session/, (r) =>
    r.fulfill(json(signedIn ? SESSION_RESPONSE : {})),
  );
  await page.route(/\/api\/auth\/csrf/, (r) => r.fulfill(json({ csrfToken: "demo" })));
  await page.route(/\/api\/auth\/providers/, (r) => r.fulfill(json({})));
  await page.route(/\/api\/profile$/, (r) => r.fulfill(json(PROFILE_RESPONSE)));
  await page.route(/\/api\/checkin(\?.*)?$/, (r) => r.fulfill(json(CHECKIN_RESPONSE)));
  await page.route(/\/api\/stripe\/status/, (r) => r.fulfill(json(STRIPE_STATUS)));
  await page.route(/\/api\/stripe\/plan-counts/, (r) => r.fulfill(json(PLAN_COUNTS)));
  await page.route(/\/api\/usage/, (r) => r.fulfill(json(USAGE_RESPONSE)));
  await page.route(/\/api\/conversations$/, (r) =>
    r.fulfill(json({ conversations: CONVERSATIONS_RESPONSE })),
  );
  await page.route(/\/api\/conversations\/[^/]+\/messages/, (r) =>
    r.fulfill(json(MESSAGES_RESPONSE)),
  );
  await page.route(/\/api\/community\/posts/, (r) => r.fulfill(json(COMMUNITY_POSTS)));
  await page.route(/\/api\/stats/, (r) =>
    r.fulfill(
      json({
        level: 4,
        xp: 340,
        xpToNextLevel: 500,
        levelName: "Rizzler",
        totalApproaches: 47,
        totalCheckins: 18,
        bestStreak: 14,
        currentStreak: 12,
      }),
    ),
  );
}
