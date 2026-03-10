"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Flame, Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

import ChatCoach from "@/components/ChatCoach";
import ConversationList from "@/components/ConversationList";
import DailyCheckin from "@/components/DailyCheckin";
import BottomNav, { type Tab } from "@/components/BottomNav";
import PostCard from "@/components/PostCard";
import StatsView from "@/components/StatsView";

function getGreeting(name?: string): string {
  const hour = new Date().getHours();
  const suffix = name ? `, ${name}` : "";

  if (hour >= 5 && hour < 12) return `Good morning${suffix}`;
  if (hour >= 12 && hour < 17) return `Good afternoon${suffix}`;
  if (hour >= 17 && hour < 22) return `Good evening${suffix}`;
  return `Good night${suffix}`;
}

type AppState = "tabs" | "conversations" | "chat" | "checkin-chat";

function getSessionState(): { state: AppState; fromPhoto: boolean; tab: Tab } {
  if (typeof window === "undefined") return { state: "tabs", fromPhoto: false, tab: "coach" };
  try {
    const saved = sessionStorage.getItem("wingmate-state");
    if (saved) return JSON.parse(saved);
  } catch {}
  return { state: "tabs", fromPhoto: false, tab: "coach" };
}

const PAGE_SIZE = 20;

export default function Home() {
  const router = useRouter();
  const [state, setState] = useState<AppState>("tabs");
  const [activeTab, setActiveTab] = useState<Tab>("coach");
  const [checkinTalked, setCheckinTalked] = useState<boolean | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [greeting, setGreeting] = useState("");
  const [checkedInToday, setCheckedInToday] = useState<boolean | null>(null);
  const [isPro, setIsPro] = useState<boolean | null>(null);

  // Community state
  const [posts, setPosts] = useState<any[]>([]);
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [sort, setSort] = useState<"new" | "top">("new");
  const [userId, setUserId] = useState("");
  const [communityLoading, setCommunityLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [communityLoaded, setCommunityLoaded] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    const saved = getSessionState();
    if (saved.state === "chat" || saved.state === "conversations") {
      setState(saved.state);
    }
    if (saved.tab) setActiveTab(saved.tab);
    setHydrated(true);

    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata;
      const full = meta?.full_name || meta?.name || "";
      const first = full.split(" ")[0] || undefined;
      setGreeting(getGreeting(first));
      if (data.user) setUserId(data.user.id);
    });

    fetch("/api/checkin")
      .then((res) => res.json())
      .then((d) => { if (!d.error) setCheckedInToday(d.checkedInToday); })
      .catch(() => {});

    fetch("/api/stripe/status")
      .then((res) => res.json())
      .then((d) => setIsPro(d.subscribed === true))
      .catch(() => setIsPro(false));
  }, []);

  // Load community posts when tab switches to community
  const fetchPosts = useCallback(async (mode: "new" | "top", offset = 0) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const order = mode === "top" ? "score" : "created_at";
    const { data } = await supabase
      .from("posts")
      .select("*")
      .order(order, { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    const postList = data || [];

    if (postList.length > 0) {
      const ids = postList.map((p: any) => p.id);
      const { data: userVotes } = await supabase
        .from("votes")
        .select("post_id, direction")
        .eq("user_id", user.id)
        .in("post_id", ids);

      const voteMap: Record<string, number> = {};
      userVotes?.forEach((v: any) => { voteMap[v.post_id] = v.direction; });

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
    setCommunityLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === "community" && !communityLoaded) {
      setCommunityLoaded(true);
      fetchPosts(sort);
    }
  }, [activeTab, communityLoaded, sort, fetchPosts]);

  const handleSortChange = (mode: "new" | "top") => {
    setSort(mode);
    setCommunityLoading(true);
    fetchPosts(mode);
  };

  const updateState = useCallback(
    (newState: AppState) => {
      setState(newState);
      try {
        sessionStorage.setItem(
          "wingmate-state",
          JSON.stringify({
            state: newState,
            fromPhoto: false,
            tab: activeTab,
          })
        );
      } catch {}
    },
    [activeTab]
  );

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === "coach") {
      // If already on wingman tab viewing history, stay there; otherwise show chat
      if (activeTab !== "coach") {
        setActiveConversationId(null);
        updateState("chat");
      }
    } else {
      updateState("tabs");
    }
    try {
      sessionStorage.setItem(
        "wingmate-state",
        JSON.stringify({ state: tab === "coach" ? "chat" : "tabs", fromPhoto: false, tab })
      );
    } catch {}
  };

  const reset = () => {
    setCheckinTalked(null);
    setActiveConversationId(null);
    updateState("tabs");
  };

  if (!hydrated) return null;

  // Full-screen: checkin-chat (no tab bar — temporary coaching flow)
  if (state === "checkin-chat") {
    return (
      <main className="min-h-screen max-w-md mx-auto">
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
    <main className="min-h-screen max-w-md mx-auto pb-20">
      {/* ===== WINGMAN TAB: CONVERSATIONS ===== */}
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

      {/* ===== WINGMAN TAB: CHAT ===== */}
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
        />
      )}

      {/* ===== CHECK-IN TAB ===== */}
      {activeTab === "checkin" && (
        <div className="px-5 pt-14 pb-10 animate-fade-in">
          <DailyCheckin
            onTalkAboutIt={(talked) => {
              setCheckinTalked(talked);
              updateState("checkin-chat");
            }}
            onCheckedIn={() => setCheckedInToday(true)}
          />
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
          <StatsView />
        </div>
      )}

      {/* ===== COMMUNITY TAB ===== */}
      {activeTab === "community" && (
        <div className="px-5 pt-14 pb-10 animate-fade-in">
          <div className="mb-6">
            <h1 className="font-display text-[28px] font-bold tracking-tight">Community</h1>
          </div>

          {isPro === null && (
            <div className="flex items-center justify-center py-20">
              <div className="w-5 h-5 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {isPro === false && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-bg-card border border-border flex items-center justify-center mb-4">
                <Lock size={24} strokeWidth={1.5} className="text-text-muted" />
              </div>
              <h2 className="font-display text-[20px] font-bold mb-2">Pro feature</h2>
              <p className="text-text-muted text-[14px] leading-relaxed mb-6 max-w-[260px]">
                Connect with other guys on the same journey. Share stories, tips, and wins.
              </p>
              <button
                onClick={() => router.push("/plans")}
                className="px-6 py-3 bg-[#1a1a1a] text-white rounded-xl font-medium text-[14px] press"
              >
                Unlock with Pro
              </button>
            </div>
          )}

          {isPro === true && (<div>
          <div className="flex items-center justify-end mb-4 -mt-2">
            <Link
              href="/community/new"
              className="h-9 px-3.5 rounded-full bg-[#1a1a1a] text-white flex items-center gap-1.5 press text-[13px] font-medium"
            >
              <Plus size={14} strokeWidth={2} />
              Post
            </Link>
          </div>

          {/* Sort toggle */}
          <div className="flex gap-1 mb-5 bg-bg-card border border-border rounded-full p-1 w-fit">
            {(["new", "top"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => handleSortChange(mode)}
                className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
                  sort === mode ? "bg-[#1a1a1a] text-white" : "text-text-muted"
                }`}
              >
                {mode === "new" ? "New" : "Top"}
              </button>
            ))}
          </div>

          {/* Posts */}
          {communityLoading ? (
            <div className="text-center text-text-muted text-[14px] py-20">Loading...</div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-text-muted text-[15px] mb-4">No posts yet.</p>
              <Link
                href="/community/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1a1a1a] text-white text-[14px] font-medium press"
              >
                <Plus size={14} strokeWidth={2} />
                Be the first to share
              </Link>
            </div>
          ) : (
            <div className="space-y-3 stagger">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  id={post.id}
                  title={post.title}
                  body={post.body}
                  authorName={post.author_name}
                  score={post.score}
                  commentCount={post.comment_count}
                  createdAt={post.created_at}
                  userId={post.user_id}
                  currentUserId={userId}
                  currentVote={votes[post.id] ?? null}
                />
              ))}

              {hasMore && (
                <button
                  onClick={() => fetchPosts(sort, posts.length)}
                  className="w-full py-3 text-center text-[14px] text-text-muted font-medium press"
                >
                  Load more
                </button>
              )}
            </div>
          )}
          </div>)}
        </div>
      )}

      <BottomNav active={activeTab} onChange={handleTabChange} />
    </main>
  );
}
