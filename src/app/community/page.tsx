"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import PostCard from "@/components/PostCard";

type SortMode = "new" | "top";

const PAGE_SIZE = 20;

export default function CommunityPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [sort, setSort] = useState<SortMode>("new");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [isPro, setIsPro] = useState<boolean | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: session } = useSession();

  const fetchPosts = async (mode: SortMode, offset = 0, query = "") => {
    if (session?.user?.id) setUserId(session.user.id);

    const sortParam = mode === "top" ? "hot" : "new";
    const page = Math.floor(offset / PAGE_SIZE);
    const params = new URLSearchParams({ sort: sortParam, page: String(page) });
    if (query) params.set("search", query);

    try {
      const res = await fetch(`/api/community/posts?${params}`);
      if (!res.ok) { setLoading(false); return; }
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
    setLoading(false);
  };

  useEffect(() => {
    fetch("/api/stripe/status")
      .then((res) => res.json())
      .then((d) => setIsPro(!!d.subscribed))
      .catch(() => setIsPro(false));
  }, []);

  useEffect(() => {
    if (isPro) fetchPosts(sort, 0, search);
  }, [sort, isPro]);

  const handleSearch = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      fetchPosts(sort, 0, value);
    }, 300);
  };

  const clearSearch = () => {
    setSearch("");
    setSearchOpen(false);
    setLoading(true);
    fetchPosts(sort, 0, "");
  };

  if (isPro === null) {
    return (
      <main className="min-h-app flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (!isPro) {
    return (
      <main className="min-h-app max-w-md mx-auto px-5 pt-6 pb-10 animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/?tab=community" className="p-1 -ml-1 press">
            <ArrowLeft size={20} strokeWidth={1.5} />
          </Link>
          <h1 className="font-display text-[20px] font-bold tracking-tight">Community</h1>
        </div>
        <div className="relative">
          <div className="space-y-3 blur-[6px] select-none pointer-events-none" aria-hidden>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-3 bg-bg-card border border-border rounded-xl shadow-card px-4 py-3.5">
                <div className="flex flex-col items-center gap-0.5 shrink-0 pt-0.5">
                  <div className="w-5 h-5 rounded bg-border" />
                  <div className="w-4 h-4 rounded bg-border" />
                  <div className="w-5 h-5 rounded bg-border" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="h-4 bg-border rounded w-3/4 mb-2" />
                  <div className="h-3 bg-border/60 rounded w-full mb-1.5" />
                  <div className="h-3 bg-border/60 rounded w-2/3 mb-3" />
                  <div className="flex items-center gap-3">
                    <div className="h-3 bg-border/40 rounded w-16" />
                    <div className="h-3 bg-border/40 rounded w-10" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-[48px] mb-4">🔒</p>
            <p className="text-text-muted text-[15px] mb-6 text-center max-w-[300px]">Community requires a Pro subscription. Subscribe to connect with other guys on the same path.</p>
            <Link
              href="/?tab=plans"
              className="bg-[#1a1a1a] text-white px-8 py-3 rounded-xl font-semibold text-[14px] press"
            >
              View plans
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-app max-w-md mx-auto px-5 pt-6 pb-10 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/?tab=community" className="p-1 -ml-1 press">
            <ArrowLeft size={20} strokeWidth={1.5} />
          </Link>
          <h1 className="font-display text-[20px] font-bold tracking-tight">Community</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setSearchOpen(!searchOpen); setTimeout(() => searchInputRef.current?.focus(), 50); }}
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
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 relative">
            <Search size={14} strokeWidth={2} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted/50" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search posts..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full bg-bg-card border border-border rounded-full pl-9 pr-4 py-2.5 text-[14px] placeholder:text-text-muted/50 outline-none focus:border-text-muted transition-colors"
            />
          </div>
          <button onClick={clearSearch} className="p-2 press text-text-muted">
            <X size={16} strokeWidth={2} />
          </button>
        </div>
      )}

      {/* Posts */}
      {loading ? (
        <div className="text-center text-text-muted text-[14px] py-20">Loading...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-text-muted text-[15px] mb-4">
            {search ? "No posts found." : "No posts yet."}
          </p>
          {!search && (
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
              onClick={() => fetchPosts(sort, posts.length, search)}
              className="w-full py-3 text-center text-[14px] text-text-muted font-medium press"
            >
              Load more
            </button>
          )}
        </div>
      )}
    </main>
  );
}
