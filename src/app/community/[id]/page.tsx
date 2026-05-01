"use client";

import { useState, useEffect, use } from "react";
import { ArrowLeft, Heart, Send, Trash2, Pencil, X, Check, Flag, Ban } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState("");
  const [isPro, setIsPro] = useState<boolean | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [reported, setReported] = useState(false);
  const [blocked, setBlocked] = useState(false);
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
      setUserId(session.user.id);
    }
  }, [session]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/community/posts/${id}`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.post) {
          setPost(data.post);
          setScore(data.post.score);
        }
        if (data.userVote != null) setVote(data.userVote);
        if (data.comments) setComments(data.comments);
        // Get username from profile API
        const profileRes = await fetch("/api/profile");
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          if (profileData.profile?.username) setUserName(profileData.profile.username);
        }
      } catch {}
    };
    load();
  }, [id]);

  const liked = vote === 1;

  const handleLike = async () => {
    if (liked) {
      setScore((s) => s - 1);
      setVote(null);
      await fetch(`/api/community/posts/${id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction: 0 }),
      });
    } else {
      const adjustment = vote === -1 ? 2 : 1;
      setScore((s) => s + adjustment);
      setVote(1);
      await fetch(`/api/community/posts/${id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction: 1 }),
      });
    }
  };

  const handleComment = async () => {
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/community/posts/${id}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.comment) {
          setComments((prev) => [...prev, { ...data.comment, user_liked: false, score: data.comment.score ?? 0 }]);
        } else {
          setComments((prev) => [...prev, {
            id: Date.now().toString(),
            post_id: id,
            user_id: userId,
            author_name: userName,
            body: commentText.trim(),
            created_at: new Date().toISOString(),
            score: 0,
            user_liked: false,
          }]);
        }
        setCommentText("");
      }
    } catch {}
    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this post? This can't be undone.")) return;
    await fetch(`/api/community/posts/${id}`, { method: "DELETE" });
    router.push("/?tab=community");
  };

  const startEditing = () => {
    setEditBody(post.body);
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editBody.trim()) return;
    try {
      const res = await fetch(`/api/community/posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: editBody.trim() }),
      });
      if (res.ok) {
        setPost((prev: any) => ({ ...prev, body: editBody.trim() }));
        setEditing(false);
      }
    } catch {}
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm("Delete this comment?")) return;
    await fetch(`/api/community/comments/${commentId}`, { method: "DELETE" });
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  const handleLikeComment = async (commentId: string) => {
    const target = comments.find((c) => c.id === commentId);
    if (!target) return;
    const nextLiked = !target.user_liked;
    // Optimistic update
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? { ...c, user_liked: nextLiked, score: (c.score ?? 0) + (nextLiked ? 1 : -1) }
          : c
      )
    );
    try {
      await fetch(`/api/community/comments/${commentId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction: nextLiked ? 1 : 0 }),
      });
    } catch {}
  };

  const handleEditComment = async (commentId: string) => {
    if (!editCommentText.trim()) return;
    try {
      const res = await fetch(`/api/community/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editCommentText.trim() }),
      });
      if (res.ok) {
        setComments((prev) => prev.map((c) => c.id === commentId ? { ...c, body: editCommentText.trim() } : c));
        setEditingCommentId(null);
        setEditCommentText("");
      }
    } catch {}
  };

  const handleReport = async () => {
    if (reported) return;
    try {
      await fetch("/api/community/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_type: "post", target_id: id, reason: "Flagged by user" }),
      });
      setReported(true);
    } catch {}
  };

  const handleBlock = async () => {
    if (!post || blocked) return;
    try {
      await fetch("/api/community/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocked_user_id: post.user_id }),
      });
      setBlocked(true);
      router.push("/?tab=community");
    } catch {}
  };

  if (!post) {
    return (
      <main className="min-h-app max-w-md mx-auto px-5 pt-6">
        <Link href="/?tab=community" className="p-1 -ml-1 press inline-block">
          <ArrowLeft size={20} strokeWidth={1.5} />
        </Link>
        <p className="text-center text-text-muted text-[14px] py-20">Loading...</p>
      </main>
    );
  }

  if (!isPro) {
    return (
      <main className="min-h-app flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-app max-w-md mx-auto px-5 pt-6 pb-24 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/?tab=community" className="p-1 -ml-1 press">
          <ArrowLeft size={20} strokeWidth={1.5} />
        </Link>
        <h1 className="font-display text-[20px] font-bold tracking-tight">Post</h1>
        {post.user_id === userId && !editing ? (
          <div className="ml-auto flex items-center gap-1">
            <button onClick={startEditing} className="p-2 press text-text-muted">
              <Pencil size={16} strokeWidth={1.5} />
            </button>
            <button onClick={handleDelete} className="p-2 press text-text-muted">
              <Trash2 size={16} strokeWidth={1.5} />
            </button>
          </div>
        ) : post.user_id !== userId && (
          <div className="ml-auto flex items-center gap-1">
            <button onClick={handleReport} className="p-2 press text-text-muted" title={reported ? "Reported" : "Report"}>
              <Flag size={16} strokeWidth={1.5} className={reported ? "fill-red-400 text-red-400" : ""} />
            </button>
            <button onClick={handleBlock} className="p-2 press text-text-muted" title="Block user">
              <Ban size={16} strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>

      {/* Post */}
      <div className="mb-6">
        {/* Author */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-full bg-bg-input flex items-center justify-center text-[14px] font-bold text-text-muted">
            {post.author_name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <Link href={`/community/user/${post.user_id}`} className="text-[15px] font-semibold hover:underline block leading-tight">
              {post.author_name}
            </Link>
            <span className="text-[12px] text-text-muted">{timeAgo(post.created_at)}</span>
          </div>
        </div>

        {editing ? (
          <div className="space-y-3">
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value.slice(0, 2000))}
              rows={6}
              className="w-full bg-bg-card border border-border rounded-xl shadow-card px-4 py-3 text-[15px] leading-relaxed outline-none focus:border-text-muted transition-colors resize-none"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveEdit}
                disabled={!editBody.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#1a1a1a] text-white rounded-full text-[13px] font-medium press disabled:opacity-50"
              >
                <Check size={14} strokeWidth={2} /> Save
              </button>
              <button
                onClick={() => setEditing(false)}
                className="flex items-center gap-1.5 px-4 py-2 text-text-muted text-[13px] press"
              >
                <X size={14} strokeWidth={2} /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap mb-4">{post.body}</p>

            {/* Like button */}
            <div className="flex items-center gap-5 text-text-muted">
              <button onClick={handleLike} className="flex items-center gap-1.5 press">
                <Heart
                  size={18}
                  strokeWidth={1.5}
                  className={liked ? "fill-red-500 text-red-500" : ""}
                />
                <span className={`text-[14px] font-medium ${liked ? "text-red-500" : ""}`}>
                  {score > 0 ? score : ""}
                </span>
              </button>
            </div>
          </>
        )}
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
            <div key={comment.id}>
              <div className="flex items-center gap-2 mb-1">
                <Link href={`/community/user/${comment.user_id}`} className="text-[13px] font-medium hover:underline">
                  {comment.author_name}
                </Link>
                <span className="text-[12px] text-text-muted">{timeAgo(comment.created_at)}</span>
                {comment.user_id === userId ? (
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="ml-auto p-1 press text-text-muted/60"
                    aria-label="Delete comment"
                  >
                    <Trash2 size={14} strokeWidth={1.5} />
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      await fetch("/api/community/report", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ target_type: "comment", target_id: comment.id, reason: "Flagged by user" }),
                      });
                    }}
                    className="ml-auto p-1 press text-text-muted/60"
                    title="Report comment"
                  >
                    <Flag size={14} strokeWidth={1.5} />
                  </button>
                )}
              </div>
              <p className="text-[14px] leading-relaxed text-text/90 mb-1.5">{comment.body}</p>
              <button
                onClick={() => handleLikeComment(comment.id)}
                className="flex items-center gap-1.5 press"
              >
                <Heart
                  size={14}
                  strokeWidth={1.5}
                  className={comment.user_liked ? "fill-red-500 text-red-500" : "text-text-muted/60"}
                />
                <span className={`text-[12px] font-medium ${comment.user_liked ? "text-red-500" : "text-text-muted/60"}`}>
                  {comment.score > 0 ? comment.score : ""}
                </span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Comment input — fixed to bottom, lifted above system nav AND the
          soft keyboard (--kb-h is set by AppShell from Capacitor's
          keyboardDidShow event; defaults to 0 when the keyboard is closed). */}
      <div
        className="fixed left-0 right-0 bg-bg border-t border-border px-5 py-3"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + var(--kb-h, 0px))" }}
      >
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
