"use client";

import { useState, useEffect, use } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import PostCard from "@/components/PostCard";

const PAGE_SIZE = 20;

export default function UserPostsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: profileUserId } = use(params);
  const [posts, setPosts] = useState<any[]>([]);
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [currentUserId, setCurrentUserId] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isPro, setIsPro] = useState<boolean | null>(null);

  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    fetch("/api/stripe/status")
      .then((res) => res.json())
      .then((d) => {
        if (!d.subscribed) router.replace("/?tab=plans");
        else setIsPro(true);
      })
      .catch(() => router.replace("/?tab=plans"));
  }, [router]);

  useEffect(() => {
    if (session?.user?.id) {
      setCurrentUserId(session.user.id);
      setIsOwnProfile(session.user.id === profileUserId);
    }
  }, [session, profileUserId]);

  const fetchPosts = async (offset = 0) => {
    const page = Math.floor(offset / PAGE_SIZE);
    const params = new URLSearchParams({ sort: "new", page: String(page) });

    try {
      const res = await fetch(`/api/community/posts?${params}&user_id=${profileUserId}`);
      if (!res.ok) { setLoading(false); return; }
      const { posts: postList = [] } = await res.json();

      if (postList.length > 0) {
        if (!authorName) setAuthorName(postList[0].author_name);

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
    fetchPosts();
  }, [profileUserId]);

  if (!isPro) {
    return (
      <main className="min-h-app flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-app max-w-md mx-auto px-5 pt-6 pb-10 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/?tab=community" className="p-1 -ml-1 press">
          <ArrowLeft size={20} strokeWidth={1.5} />
        </Link>
        <h1 className="font-display text-[20px] font-bold tracking-tight">
          {isOwnProfile ? "Your posts" : authorName ? `${authorName}'s posts` : "Posts"}
        </h1>
      </div>

      {loading ? (
        <div className="text-center text-text-muted text-[14px] py-20">Loading...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-text-muted text-[15px]">
            {isOwnProfile ? "You haven't posted yet." : "No posts yet."}
          </p>
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
              currentUserId={currentUserId}
              currentVote={votes[post.id] ?? null}
              recentComments={post.recent_comments || []}
            />
          ))}

          {hasMore && (
            <button
              onClick={() => fetchPosts(posts.length)}
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
