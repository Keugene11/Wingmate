"use client";

import { useState, useEffect, use } from "react";
import { ArrowLeft, ChevronUp, ChevronDown, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { timeAgo } from "@/lib/time";

export default function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("Anonymous");
  const [vote, setVote] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const meta = user.user_metadata;
      setUserName((meta?.full_name || meta?.name || "Anonymous").split(" ")[0]);

      const { data: postData } = await supabase
        .from("posts")
        .select("*")
        .eq("id", id)
        .single();

      if (!postData) return;
      setPost(postData);
      setScore(postData.score);

      const { data: voteData } = await supabase
        .from("votes")
        .select("direction")
        .eq("post_id", id)
        .eq("user_id", user.id)
        .single();

      if (voteData) setVote(voteData.direction);

      const { data: commentData } = await supabase
        .from("comments")
        .select("*")
        .eq("post_id", id)
        .order("created_at", { ascending: true });

      setComments(commentData || []);
    };
    load();
  }, [id]);

  const handleVote = async (direction: 1 | -1) => {
    if (vote === direction) {
      setScore((s) => s - direction);
      setVote(null);
      await supabase.from("votes").delete().eq("post_id", id).eq("user_id", userId);
    } else {
      const adjustment = vote ? direction * 2 : direction;
      setScore((s) => s + adjustment);
      setVote(direction);
      await supabase.from("votes").upsert(
        { user_id: userId, post_id: id, direction },
        { onConflict: "user_id,post_id" }
      );
    }
  };

  const handleComment = async () => {
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);

    const { data, error } = await supabase
      .from("comments")
      .insert({
        post_id: id,
        user_id: userId,
        author_name: userName,
        body: commentText.trim(),
      })
      .select()
      .single();

    if (!error && data) {
      setComments((prev) => [...prev, data]);
      setCommentText("");
    }
    setSubmitting(false);
  };

  const handleDelete = async () => {
    await supabase.from("posts").delete().eq("id", id);
    router.push("/");
  };

  const handleDeleteComment = async (commentId: string) => {
    await supabase.from("comments").delete().eq("id", commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  if (!post) {
    return (
      <main className="min-h-screen max-w-md mx-auto px-5 pt-6">
        <Link href="/" className="p-1 -ml-1 press inline-block">
          <ArrowLeft size={20} strokeWidth={1.5} />
        </Link>
        <p className="text-center text-text-muted text-[14px] py-20">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen max-w-md mx-auto px-5 pt-6 pb-24 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="p-1 -ml-1 press">
          <ArrowLeft size={20} strokeWidth={1.5} />
        </Link>
        <h1 className="font-display text-[20px] font-bold tracking-tight">Post</h1>
        {post.user_id === userId && (
          <button onClick={handleDelete} className="ml-auto p-2 press text-text-muted">
            <Trash2 size={16} strokeWidth={1.5} />
          </button>
        )}
      </div>

      {/* Post */}
      <div className="mb-6">
        <div className="flex gap-3">
          <div className="flex flex-col items-center gap-0.5 shrink-0">
            <button
              onClick={() => handleVote(1)}
              className={`p-0.5 rounded ${vote === 1 ? "text-orange-500" : "text-text-muted"}`}
            >
              <ChevronUp size={20} strokeWidth={2} />
            </button>
            <span className={`text-[14px] font-semibold tabular-nums ${score > 0 ? "text-orange-500" : score < 0 ? "text-blue-500" : "text-text-muted"}`}>
              {score}
            </span>
            <button
              onClick={() => handleVote(-1)}
              className={`p-0.5 rounded ${vote === -1 ? "text-blue-500" : "text-text-muted"}`}
            >
              <ChevronDown size={20} strokeWidth={2} />
            </button>
          </div>
          <div className="flex-1">
            <h2 className="font-display text-[20px] font-bold tracking-tight leading-snug mb-2">{post.title}</h2>
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap mb-3">{post.body}</p>
            <p className="text-[12px] text-text-muted">
              {post.author_name} · {timeAgo(post.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border mb-4" />

      {/* Comments */}
      <h3 className="text-[14px] font-semibold mb-4">
        {comments.length} {comments.length === 1 ? "comment" : "comments"}
      </h3>

      {comments.length === 0 ? (
        <p className="text-text-muted text-[14px] py-6 text-center">No comments yet.</p>
      ) : (
        <div className="space-y-4 mb-6">
          {comments.map((comment) => (
            <div key={comment.id} className="group">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[13px] font-medium">{comment.author_name}</span>
                <span className="text-[12px] text-text-muted">{timeAgo(comment.created_at)}</span>
                {comment.user_id === userId && (
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="ml-auto opacity-0 group-hover:opacity-100 p-1 press text-text-muted"
                  >
                    <Trash2 size={12} strokeWidth={1.5} />
                  </button>
                )}
              </div>
              <p className="text-[14px] leading-relaxed text-text/90">{comment.body}</p>
            </div>
          ))}
        </div>
      )}

      {/* Comment input — fixed to bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-bg border-t border-border px-5 py-3">
        <div className="max-w-md mx-auto flex items-center gap-2">
          <input
            type="text"
            placeholder="Add a comment..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value.slice(0, 500))}
            onKeyDown={(e) => e.key === "Enter" && handleComment()}
            className="flex-1 bg-bg-card border border-border rounded-full px-4 py-2.5 text-[14px] placeholder:text-text-muted/50 outline-none focus:border-text-muted transition-colors"
          />
          <button
            onClick={handleComment}
            disabled={!commentText.trim() || submitting}
            className={`w-9 h-9 rounded-full flex items-center justify-center press transition-opacity ${
              commentText.trim() ? "bg-[#1a1a1a] text-white" : "bg-border text-text-muted opacity-50"
            }`}
          >
            <Send size={14} strokeWidth={2} />
          </button>
        </div>
      </div>
    </main>
  );
}
