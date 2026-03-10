"use client";

import { useState, useEffect, useCallback } from "react";
import { Camera, Upload, MessageCircle, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import ImageAnnotator from "@/components/ImageAnnotator";
import ChatCoach from "@/components/ChatCoach";
import DailyCheckin from "@/components/DailyCheckin";
import BottomNav, { type Tab } from "@/components/BottomNav";
import PostCard from "@/components/PostCard";

function getGreeting(name?: string): string {
  const hour = new Date().getHours();
  const suffix = name ? `, ${name}` : "";

  if (hour >= 5 && hour < 12) return `Good morning${suffix}`;
  if (hour >= 12 && hour < 17) return `Good afternoon${suffix}`;
  if (hour >= 17 && hour < 22) return `Good evening${suffix}`;
  return `Good night${suffix}`;
}

type AppState = "tabs" | "annotate" | "chat" | "checkin-chat";

function getSessionState(): { state: AppState; fromPhoto: boolean; tab: Tab } {
  if (typeof window === "undefined") return { state: "tabs", fromPhoto: false, tab: "coach" };
  try {
    const saved = sessionStorage.getItem("approachai-state");
    if (saved) return JSON.parse(saved);
  } catch {}
  return { state: "tabs", fromPhoto: false, tab: "coach" };
}

const PAGE_SIZE = 20;

export default function Home() {
  const [state, setState] = useState<AppState>("tabs");
  const [activeTab, setActiveTab] = useState<Tab>("coach");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameFromPhoto, setCameFromPhoto] = useState(false);
  const [checkinTalked, setCheckinTalked] = useState<boolean | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [greeting, setGreeting] = useState("");

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
    if (saved.state === "chat") {
      setState("chat");
      setCameFromPhoto(saved.fromPhoto);
      try {
        const img = sessionStorage.getItem("approachai-image");
        if (img) setCapturedImage(img);
      } catch {}
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
    (newState: AppState, fromPhoto?: boolean) => {
      setState(newState);
      if (fromPhoto !== undefined) setCameFromPhoto(fromPhoto);
      try {
        sessionStorage.setItem(
          "approachai-state",
          JSON.stringify({
            state: newState,
            fromPhoto: fromPhoto ?? cameFromPhoto,
            tab: activeTab,
          })
        );
      } catch {}
    },
    [cameFromPhoto, activeTab]
  );

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    try {
      sessionStorage.setItem(
        "approachai-state",
        JSON.stringify({ state: "tabs", fromPhoto: false, tab })
      );
    } catch {}
  };

  const compressImage = (dataUrl: string, maxWidth = 800): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = dataUrl;
    });
  };

  const handleCapture = async (imageData: string) => {
    setCapturedImage(imageData);
    setState("annotate");
    const compressed = await compressImage(imageData);
    try { sessionStorage.setItem("approachai-image", compressed); } catch {}
  };

  const reset = () => {
    setCapturedImage(null);
    try { sessionStorage.removeItem("approachai-image"); } catch {}
    setCameFromPhoto(false);
    setCheckinTalked(null);
    updateState("tabs", false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => handleCapture(reader.result as string);
    reader.readAsDataURL(file);
  };

  if (!hydrated) return null;

  // Full-screen states (no tab bar)
  if (state === "annotate" && capturedImage) {
    return (
      <main className="min-h-screen max-w-md mx-auto">
        <div className="px-5 pt-6 pb-8 animate-fade-in">
          <ImageAnnotator
            imageData={capturedImage}
            onConfirm={() => updateState("chat", true)}
            onBack={() => {
              setCapturedImage(null);
              setState("tabs");
            }}
          />
        </div>
      </main>
    );
  }

  if (state === "chat") {
    return (
      <main className="min-h-screen max-w-md mx-auto">
        <ChatCoach onBack={reset} fromPhoto={cameFromPhoto} imageData={capturedImage} />
      </main>
    );
  }

  if (state === "checkin-chat") {
    return (
      <main className="min-h-screen max-w-md mx-auto">
        <ChatCoach onBack={reset} checkinMode={checkinTalked !== null ? (checkinTalked ? "talked" : "didnt-talk") : undefined} />
      </main>
    );
  }

  // Tab-based layout
  return (
    <main className="min-h-screen max-w-md mx-auto pb-20">
      {/* ===== CHECK-IN TAB ===== */}
      {activeTab === "checkin" && (
        <div className="px-5 pt-14 pb-10 animate-fade-in">
          <div className="mb-8 animate-slide-up">
            <h1 className="font-display text-[28px] font-bold tracking-tight leading-[1.2] mb-2">
              {greeting}
            </h1>
            <p className="text-text-muted text-[15px] leading-relaxed">
              Track your daily progress
            </p>
          </div>

          <DailyCheckin
            onTalkAboutIt={(talked) => {
              setCheckinTalked(talked);
              updateState("checkin-chat", false);
            }}
          />
        </div>
      )}

      {/* ===== COACH TAB ===== */}
      {activeTab === "coach" && (
        <div className="px-5 pt-14 pb-10 animate-fade-in">
          <div className="mb-10 animate-slide-up">
            <h1 className="font-display text-[28px] font-bold tracking-tight leading-[1.2] mb-2">
              {greeting}
            </h1>
            <p className="text-text-muted text-[15px] leading-relaxed">
              Ready to make a move?
            </p>
          </div>

          <div className="space-y-3 stagger">
            {/* Take photo */}
            <label className="flex items-center gap-4 w-full bg-[#1a1a1a] text-white rounded-2xl px-5 py-4.5 cursor-pointer press">
              <Camera size={22} strokeWidth={1.5} className="shrink-0" />
              <p className="font-medium text-[16px]">Take a photo</p>
              <ChevronRight size={16} className="ml-auto text-white/30 shrink-0" />
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>

            {/* Upload */}
            <label className="flex items-center gap-4 w-full bg-bg-card border border-border rounded-2xl px-5 py-4.5 cursor-pointer press">
              <Upload size={22} strokeWidth={1.5} className="text-text-muted shrink-0" />
              <p className="font-medium text-[16px]">Upload a photo</p>
              <ChevronRight size={16} className="ml-auto text-border shrink-0" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>

            {/* Chat */}
            <button
              onClick={() => updateState("chat", false)}
              className="flex items-center gap-4 w-full bg-bg-card border border-border rounded-2xl px-5 py-4.5 text-left press"
            >
              <MessageCircle size={22} strokeWidth={1.5} className="text-text-muted shrink-0" />
              <p className="font-medium text-[16px]">Just talk to me</p>
              <ChevronRight size={16} className="ml-auto text-border shrink-0" />
            </button>
          </div>

          <p className="text-center text-[12px] text-text-muted mt-12">
            Your photos stay on your device. Always.
          </p>
        </div>
      )}

      {/* ===== COMMUNITY TAB ===== */}
      {activeTab === "community" && (
        <div className="px-5 pt-14 pb-10 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <h1 className="font-display text-[28px] font-bold tracking-tight">Community</h1>
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
        </div>
      )}

      <BottomNav active={activeTab} onChange={handleTabChange} />
    </main>
  );
}
