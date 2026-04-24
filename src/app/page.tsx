"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { Plus, Search, X, Check } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { initPurchases, identifyUser } from "@/lib/purchases";
import { isNativeiOS } from "@/lib/platform";
import { hideSplash, openInAppBrowser, checkForUpdate, initSocialLogin } from "@/lib/capacitor";
import { isNativePlatform } from "@/lib/platform";

import ChatCoach from "@/components/ChatCoach";
import ConversationList from "@/components/ConversationList";
import DailyCheckin from "@/components/DailyCheckin";
import type { Tab } from "@/components/BottomNav";
import PostCard from "@/components/PostCard";
import PlanView from "@/components/PlanView";
import StatsView from "@/components/StatsView";

function getGreeting(name?: string): string {
  const first = name || "king";
  const lines = [
    `Go talk to her, ${first}.`,
    `No excuses today, ${first}.`,
    `She's waiting, ${first}.`,
    `Make a move, ${first}.`,
    `Go get her number, ${first}.`,
    `Approach someone new, ${first}.`,
    `Be bold today, ${first}.`,
  ];
  // Pick one based on day of year so it's consistent within the same day
  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  return lines[dayOfYear % lines.length];
}

type AppState = "tabs" | "conversations" | "chat" | "checkin-chat";

const PAGE_SIZE = 20;

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeInner />
    </Suspense>
  );
}

function HomeInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = typeof window !== "undefined" && sessionStorage.getItem("wingmate-active-tab");
      return saved === "coach" ? "chat" : "tabs";
    } catch { return "tabs"; }
  });
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    try {
      const saved = typeof window !== "undefined" && sessionStorage.getItem("wingmate-active-tab");
      if (saved && ["checkin", "coach", "plan", "stats", "community", "plans"].includes(saved)) return saved as Tab;
    } catch {}
    return "checkin";
  });
  const [checkinTalked, setCheckinTalked] = useState<boolean | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [greeting, setGreeting] = useState("");
  const [isPro, setIsPro] = useState<boolean | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  // Community state
  const [posts, setPosts] = useState<any[]>([]);
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [sort, setSort] = useState<"new" | "top">("new");
  const [userId, setUserId] = useState("");
  const [communityLoading, setCommunityLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [communityLoaded, setCommunityLoaded] = useState(false);
  const [communitySearch, setCommunitySearch] = useState("");
  const [communitySearchOpen, setCommunitySearchOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [planCounts, setPlanCounts] = useState<{ monthly: number; yearly: number } | null>(null);
  const communityDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const communitySearchRef = useRef<HTMLInputElement>(null);

  const { data: session, status: sessionStatus } = useSession();

  // React to URL tab changes (BottomNav uses Link navigation).
  useEffect(() => {
    const tabParam = searchParams.get("tab") as Tab | null;
    if (tabParam && ["checkin", "coach", "plan", "stats", "community", "plans"].includes(tabParam)) {
      setActiveTab(tabParam);
      setState(tabParam === "coach" ? "chat" : "tabs");
      try { sessionStorage.setItem("wingmate-active-tab", tabParam); } catch {}
    } else if (!tabParam) {
      // No ?tab= => checkin (default landing tab).
      setActiveTab("checkin");
      setState("tabs");
      try { sessionStorage.setItem("wingmate-active-tab", "checkin"); } catch {}
    }
  }, [searchParams]);

  useEffect(() => {
    setHydrated(true);

    // Check for native app updates
    checkForUpdate().then((needsUpdate) => {
      if (needsUpdate) setUpdateAvailable(true);
    });

    if (sessionStatus === "loading") {
      // Safety: hide splash after timeout so the app never appears frozen
      const t = setTimeout(() => hideSplash(), 3000);
      return () => clearTimeout(t);
    }

    if (!session?.user) {
      // Leave the splash up so there's no flash of the home page before
      // /onboarding mounts. The onboarding page calls hideSplash itself.
      router.replace("/onboarding");
      return;
    }

    // Session resolved and user is authenticated — hide splash, we may
    // still be checking subscription but the gate below keeps the UI
    // on a spinner until that resolves.
    hideSplash();

    const user = session.user;
    const firstName = user.name?.split(" ")[0];
    setGreeting(getGreeting(firstName));
    setUserId(user.id!);
    setIsLoggedIn(true);
    // Initialize native plugins on iOS
    initSocialLogin();
    initPurchases().then(() => identifyUser(user.id!));
    // Load profile
    fetch("/api/profile").then((r) => r.json()).catch(() => {});
    // If there's a pending checkout plan from onboarding, check sub status first
    try {
      const pendingPlan = sessionStorage.getItem("wingmate-checkout-plan")
        || localStorage.getItem("pending-checkout-plan");
      if (pendingPlan) {
        sessionStorage.removeItem("wingmate-checkout-plan");
        localStorage.removeItem("pending-checkout-plan");
        // On iOS, redirect to plans page for IAP checkout
        if (isNativeiOS()) {
          router.replace("/plans");
        } else {
          // Only redirect to Stripe checkout if not already subscribed
          fetch("/api/stripe/status")
            .then((r) => r.json())
            .then((d) => {
              if (!d.subscribed) {
                return fetch("/api/stripe/checkout", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ plan: pendingPlan }),
                })
                  .then((r) => r.json())
                  .then((d) => { if (d.url) openInAppBrowser(d.url); });
              }
            })
            .catch(() => {});
        }
      }
    } catch {}
    // If there's a pending message from pre-auth, switch to coach tab
    try {
      if (sessionStorage.getItem("wingmate-pending-message")) {
        setActiveTab("coach");
        setState("chat");
      }
    } catch {};

    const isPostCheckout = searchParams.get("checkout") === "success";
    if (isPostCheckout) setCheckoutPending(true);

    let retries = 0;
    const MAX_RETRIES = 10;
    const checkStatus = () =>
      fetch("/api/stripe/status")
        .then((res) => res.json())
        .then((d) => {
          if (d.subscribed) {
            setIsPro(true);
            setCheckoutPending(false);
            // Clean up the checkout param from URL
            if (isPostCheckout) {
              const url = new URL(window.location.href);
              url.searchParams.delete("checkout");
              window.history.replaceState({}, "", url.toString());
            }
          } else if (isPostCheckout && retries < MAX_RETRIES) {
            // Webhook hasn't fired yet — retry (max 10 times = 15s)
            retries++;
            return new Promise<void>((resolve) =>
              setTimeout(() => checkStatus().then(resolve), 1500)
            );
          } else {
            setIsPro(false);
            setCheckoutPending(false);
            router.replace("/onboarding");
          }
        })
        .catch(() => {
          setIsPro(false);
          setCheckoutPending(false);
          router.replace("/onboarding");
        });

    checkStatus();

  }, [session, sessionStatus]);

  // Load community posts when tab switches to community
  const fetchPosts = useCallback(async (mode: "new" | "top", offset = 0, query = "") => {
    const sortParam = mode === "top" ? "hot" : "new";
    const page = Math.floor(offset / PAGE_SIZE);
    const params = new URLSearchParams({ sort: sortParam, page: String(page) });
    if (query) params.set("search", query);

    try {
      const res = await fetch(`/api/community/posts?${params}`);
      if (!res.ok) { setCommunityLoading(false); return; }
      const { posts: postList = [] } = await res.json();

      if (postList.length > 0) {
        const voteMap: Record<string, number> = {};
        postList.forEach((p: any) => { if (p.user_vote != null) voteMap[p.id] = p.user_vote; });

        if (offset === 0) {
          setPosts(postList);
          setVotes(voteMap);
        } else {
          setPosts((prev) => [...prev, ...postList]);
          setVotes((prev) => ({ ...prev, ...voteMap }));
        }
      } else if (offset === 0) {
        setPosts([]);
      }

      setHasMore(postList.length === PAGE_SIZE);
    } catch {}
    setCommunityLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === "plans" && !planCounts) {
      fetch("/api/stripe/plan-counts").then((r) => r.json()).then(setPlanCounts).catch(() => {});
    }
  }, [activeTab, planCounts]);

  useEffect(() => {
    if (activeTab === "community" && !communityLoaded) {
      setCommunityLoaded(true);
      fetchPosts(sort);
    }
  }, [activeTab, communityLoaded, sort, fetchPosts]);

  const handleSortChange = (mode: "new" | "top") => {
    setSort(mode);
    setCommunityLoading(true);
    fetchPosts(mode, 0, communitySearch);
  };

  const handleCommunitySearch = (value: string) => {
    setCommunitySearch(value);
    if (communityDebounceRef.current) clearTimeout(communityDebounceRef.current);
    communityDebounceRef.current = setTimeout(() => {
      setCommunityLoading(true);
      fetchPosts(sort, 0, value);
    }, 300);
  };

  const clearCommunitySearch = () => {
    setCommunitySearch("");
    setCommunitySearchOpen(false);
    setCommunityLoading(true);
    fetchPosts(sort, 0, "");
  };

  const handleCheckout = async (plan: "monthly" | "yearly") => {
    // iOS must use In-App Purchase (Apple Guideline 3.1.1) — redirect to /plans
    if (isNativeiOS()) {
      router.push("/plans");
      return;
    }
    setCheckoutLoading(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) openInAppBrowser(data.url);
      else setCheckoutLoading(null);
    } catch {
      setCheckoutLoading(null);
    }
  };

  const updateState = useCallback(
    (newState: AppState) => {
      setState(newState);
    },
    []
  );

  const reset = () => {
    setCheckinTalked(null);
    setActiveConversationId(null);
    updateState("tabs");
  };

  if (
    !hydrated ||
    sessionStatus === "loading" ||
    !session?.user ||
    isLoggedIn === null ||
    isPro === null ||
    isPro === false
  ) return (
    <main className="min-h-app flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
    </main>
  );

  if (checkoutPending) return (
    <main className="min-h-app flex flex-col items-center justify-center gap-4 px-6 text-center animate-fade-in">
      <div className="w-6 h-6 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
      <p className="font-display text-[18px] font-bold">Activating your Pro plan...</p>
      <p className="text-text-muted text-[14px]">This only takes a few seconds.</p>
    </main>
  );

  // Full-screen: checkin-chat (no tab bar — temporary coaching flow)
  if (state === "checkin-chat") {
    return (
      <main className="min-h-app max-w-md mx-auto">
        <ChatCoach
          onBack={reset}
          checkinMode={checkinTalked !== null ? (checkinTalked ? "talked" : "didnt-talk") : undefined}
          onConversationCreated={(id) => setActiveConversationId(id)}
        />
      </main>
    );
  }

  // Tab-based layout (tab bar always visible)
  return (
    <main className={`max-w-md mx-auto ${activeTab === "coach" ? "h-app overflow-hidden" : "min-h-app pb-20"}`}>

      {/* Update banner */}
      {updateAvailable && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-[#1a1a1a] text-white px-5 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] flex items-center justify-between animate-slide-up">
          <p className="text-[14px] font-medium">A new version is available</p>
          <button
            onClick={() => {
              const url = isNativeiOS()
                ? "https://apps.apple.com/app/id6743187498"
                : "https://play.google.com/store/apps/details?id=live.wingmate.app";
              openInAppBrowser(url);
            }}
            className="bg-white text-[#1a1a1a] px-4 py-1.5 rounded-full text-[13px] font-semibold press"
          >
            Update
          </button>
        </div>
      )}

      {/* ===== WINGMATE TAB: CONVERSATIONS ===== */}
      {activeTab === "coach" && state === "conversations" && (
        <ConversationList
          onBack={() => updateState("tabs")}
          onSelectConversation={(id) => {
            setActiveConversationId(id);
            updateState("chat");
          }}
          onNewChat={() => {
            setActiveConversationId(null);
            updateState("chat");
          }}
        />
      )}

      {/* ===== WINGMATE TAB: CHAT ===== */}
      {activeTab === "coach" && (state === "chat" || state === "tabs") && (
        <ChatCoach
          onBack={() => {
            setActiveConversationId(null);
            updateState("tabs");
          }}
          conversationId={activeConversationId}
          onConversationCreated={(id) => setActiveConversationId(id)}
          onShowHistory={() => {
            updateState("conversations");
          }}
          onNewChat={() => {
            setActiveConversationId(null);
            updateState("chat");
          }}
          showBottomPadding
          isLoggedIn={isLoggedIn === true}
        />
      )}

      {/* ===== CHECK-IN TAB ===== */}
      {activeTab === "checkin" && (
        <div className="px-5 pt-14 pb-10 animate-fade-in">
          <DailyCheckin
            greeting={greeting}
            onTalkAboutIt={(talked) => {
              setCheckinTalked(talked);
              updateState("checkin-chat");
            }}
            isLoggedIn={isLoggedIn === true}
            isPro={isPro === true}
          />
        </div>
      )}

      {/* ===== PLAN TAB ===== */}
      {activeTab === "plan" && (
        <div className="px-5 pt-14 pb-10 animate-fade-in">
          <PlanView />
        </div>
      )}

      {/* ===== STATS TAB ===== */}
      {activeTab === "stats" && (
        <div className="px-5 pt-14 pb-10 animate-fade-in">
          <div className="mb-6">
            <h1 className="font-display text-[28px] font-bold tracking-tight leading-[1.2] mb-2">
              Stats
            </h1>
            <p className="text-text-muted text-[15px] leading-relaxed">
              Your approach history at a glance
            </p>
          </div>
          <StatsView isPro={true} />

        </div>
      )}

      {/* ===== COMMUNITY TAB ===== */}
      {activeTab === "community" && (
        <div className="px-5 pt-14 pb-10 animate-fade-in">
          <div className="mb-6">
            <h1 className="font-display text-[28px] font-bold tracking-tight">Community</h1>
          </div>

          <div>
          <div className="flex items-center justify-end mb-4 -mt-2 gap-2">
            <button
              onClick={() => { setCommunitySearchOpen(!communitySearchOpen); setTimeout(() => communitySearchRef.current?.focus(), 50); }}
              className="w-9 h-9 rounded-full flex items-center justify-center press text-text-muted"
            >
              <Search size={16} strokeWidth={2} />
            </button>
            <Link
              href="/community/new"
              className="h-9 px-3.5 rounded-full bg-[#1a1a1a] text-white flex items-center gap-1.5 press text-[13px] font-medium"
            >
              <Plus size={14} strokeWidth={2} />
              Post
            </Link>
          </div>

          {/* Search bar */}
          {communitySearchOpen && (
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 relative">
                <Search size={14} strokeWidth={2} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted/50" />
                <input
                  ref={communitySearchRef}
                  type="text"
                  placeholder="Search posts..."
                  value={communitySearch}
                  onChange={(e) => handleCommunitySearch(e.target.value)}
                  className="w-full bg-bg-card border border-border rounded-full pl-9 pr-4 py-2.5 text-[14px] placeholder:text-text-muted/50 outline-none focus:border-text-muted transition-colors"
                />
              </div>
              <button onClick={clearCommunitySearch} className="p-2 press text-text-muted">
                <X size={16} strokeWidth={2} />
              </button>
            </div>
          )}

          {/* Posts */}
          {communityLoading ? (
            <div className="text-center text-text-muted text-[14px] py-20">Loading...</div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-text-muted text-[15px] mb-4">
                {communitySearch ? "No posts found." : "No posts yet."}
              </p>
              {!communitySearch && (
                <Link
                  href="/community/new"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1a1a1a] text-white text-[14px] font-medium press"
                >
                  <Plus size={14} strokeWidth={2} />
                  Be the first to share
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3 stagger">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  id={post.id}
                  body={post.body}
                  authorName={post.author_name}
                  score={post.score}
                  commentCount={post.comment_count}
                  createdAt={post.created_at}
                  userId={post.user_id}
                  currentUserId={userId}
                  currentVote={votes[post.id] ?? null}
                  recentComments={post.recent_comments || []}
                />
              ))}

              {hasMore && (
                <button
                  onClick={() => fetchPosts(sort, posts.length, communitySearch)}
                  className="w-full py-3 text-center text-[14px] text-text-muted font-medium press"
                >
                  Load more
                </button>
              )}
            </div>
          )}
          </div>
        </div>
      )}

      {/* ===== PLANS TAB ===== */}
      {activeTab === "plans" && (
        <div className="px-5 pt-14 pb-32 animate-fade-in">
          <div className="text-center mb-10">
            <h1 className="font-display text-[28px] font-bold tracking-tight leading-[1.2] mb-3">
              {isPro ? "Your plan" : "Unlock everything"}
            </h1>
            <p className="text-text-muted text-[15px] leading-relaxed max-w-[340px] mx-auto">
              {isPro
                ? "You have unlimited access to all Pro features."
                : "Unlimited AI coaching and full approach tracker access."}
            </p>
          </div>

          {/* Active subscriber banner */}
          {isPro && (
            <div className="bg-bg-card border-2 border-[#1a1a1a] rounded-2xl p-5 relative mb-4">
              <span className="absolute -top-3 left-6 bg-[#1a1a1a] text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                Current plan
              </span>
              <div className="flex items-center gap-2 mt-1 mb-3">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-[14px] font-semibold">Wingmate Pro</span>
              </div>
              <button
                onClick={async () => {
                  if (isNativeiOS()) {
                    openInAppBrowser("https://apps.apple.com/account/subscriptions");
                    return;
                  }
                  try {
                    const res = await fetch("/api/stripe/portal", { method: "POST" });
                    const data = await res.json();
                    if (data.url) openInAppBrowser(data.url);
                  } catch {}
                }}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-bg-input text-[14px] font-semibold press"
              >
                {isNativeiOS() ? "Manage subscription" : "Manage billing"}
              </button>
            </div>
          )}

          <div className="space-y-4">
            {/* Yearly Pro */}
            <div className="bg-bg-card border-2 border-[#1a1a1a] rounded-2xl p-6 relative">
              <span className="absolute -top-3 left-6 bg-green-500 text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                Save 75%
              </span>
              <div className="flex items-start justify-between mt-1 mb-2">
                <div>
                  <h3 className="font-display text-[18px] font-bold mb-1">Pro Yearly</h3>
                  <p className="text-text-muted text-[14px]">Unlimited AI coaching & analysis</p>
                </div>
                <div className="text-right">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-text-muted text-[11px] font-medium line-through">$100</span>
                    <span className="font-display text-[28px] font-extrabold">$29.99</span>
                    <span className="text-text-muted text-[14px] font-medium">/yr</span>
                  </div>
                </div>
              </div>
              <p className="text-text-muted text-[12px] mb-1">$29.99 billed annually</p>
              {planCounts && (
                <p className="text-text-muted text-[12px] mb-4">{planCounts.yearly} {planCounts.yearly === 1 ? "person" : "people"} on this plan</p>
              )}
              {!isPro && (
                <button
                  onClick={() => handleCheckout("yearly")}
                  disabled={!!checkoutLoading}
                  className="w-full bg-[#1a1a1a] text-white py-3 rounded-xl font-semibold text-[14px] press disabled:opacity-60 mb-5"
                >
                  {checkoutLoading === "yearly" ? "Redirecting..." : "Subscribe yearly"}
                </button>
              )}
              <div className="space-y-3">
                {["Unlimited AI coaching", "Approach tracker & stats", "Daily check-ins & streaks", "Community access"].map((f) => (
                  <div key={f} className="flex items-center gap-3">
                    <Check size={16} strokeWidth={2.5} className="text-[#1a1a1a] shrink-0" />
                    <span className="text-[14px]">{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Monthly Pro */}
            <div className="bg-bg-card border border-border rounded-2xl shadow-card p-6">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-display text-[18px] font-bold mb-1">Pro Monthly</h3>
                  <p className="text-text-muted text-[14px]">Unlimited AI coaching & analysis</p>
                </div>
                <div className="text-right">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-text-muted text-[11px] font-medium line-through">$30</span>
                    <span className="font-display text-[28px] font-extrabold">$9.99</span>
                    <span className="text-text-muted text-[14px] font-medium">/mo</span>
                  </div>
                </div>
              </div>
              <p className="text-text-muted text-[12px] mb-1">Cancel anytime</p>
              {planCounts && (
                <p className="text-text-muted text-[12px] mb-4">{planCounts.monthly} {planCounts.monthly === 1 ? "person" : "people"} on this plan</p>
              )}
              {!isPro && (
                <button
                  onClick={() => handleCheckout("monthly")}
                  disabled={!!checkoutLoading}
                  className="w-full bg-bg-input text-text py-3 rounded-xl font-semibold text-[14px] press disabled:opacity-60 mb-5"
                >
                  {checkoutLoading === "monthly" ? "Redirecting..." : "Subscribe monthly"}
                </button>
              )}
              <div className="space-y-3">
                {["Unlimited AI coaching", "Approach tracker & stats", "Daily check-ins & streaks", "Community access"].map((f) => (
                  <div key={f} className="flex items-center gap-3">
                    <Check size={16} strokeWidth={2.5} className="text-text-muted shrink-0" />
                    <span className="text-[14px]">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Motivational sell */}
          <div className="mt-10 space-y-6">
              <div className="rounded-2xl bg-[#1a1a1a] text-white px-6 py-7">
                <h3 className="font-display text-[20px] font-bold leading-snug mb-4">
                  Think about how sick it would be.
                </h3>
                <p className="text-white/70 text-[15px] leading-relaxed mb-4">
                  You see her across the room. Your heart&apos;s pounding. You walk over, say exactly the right thing, and she lights up. You get her number. You go home feeling like a king.
                </p>
                <p className="text-white/70 text-[15px] leading-relaxed mb-4">
                  That moment — that rush — is worth way more than $9.99.
                </p>
                <p className="text-white/70 text-[15px] leading-relaxed">
                  Cold approaching your crush and overcoming your nerves to actually talk to her is one of the most fulfilling experiences of your life. It&apos;s something you&apos;ll remember forever. Not the Netflix you watched that night. Not the scroll session. The time you actually went for it.
                </p>
              </div>

              <div className="rounded-2xl bg-[#1a1a1a] text-white px-6 py-7">
                <h3 className="font-display text-[18px] font-bold leading-snug mb-4">
                  Wingmate makes it happen.
                </h3>
                <p className="text-white/70 text-[15px] leading-relaxed mb-4">
                  Your AI wingmate tells you exactly what to say. The tracker keeps you accountable. The community has guys on the same path cheering you on.
                </p>
                <p className="text-white text-[15px] leading-relaxed font-semibold">
                  One approach that goes right will change how you see yourself. Wingmate is how you get there.
                </p>
              </div>
          </div>

          <div className="text-center text-[13px] text-text-muted mt-8">
            <p>Secure payment via Stripe &middot; Cancel anytime</p>
          </div>
        </div>
      )}

    </main>
  );
}
