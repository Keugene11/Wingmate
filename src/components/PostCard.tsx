"use client";

import { useState } from "react";
import { Heart, MessageCircle, Flag } from "lucide-react";
import Link from "next/link";
import { timeAgo } from "@/lib/time";

interface PreviewComment {
  id: string;
  author_name: string;
  body: string;
  created_at: string;
}

interface PostCardProps {
  id: string;
  body: string;
  authorName: string;
  score: number;
  commentCount: number;
  createdAt: string;
  userId: string;
  currentUserId: string;
  currentVote: number | null;
  recentComments?: PreviewComment[];
}

export default function PostCard({
  id,
  body,
  authorName,
  score: initialScore,
  commentCount,
  createdAt,
  userId,
  currentUserId,
  currentVote: initialVote,
  recentComments = [],
}: PostCardProps) {
  const [score, setScore] = useState(initialScore);
  const [liked, setLiked] = useState(initialVote === 1);
  const [reported, setReported] = useState(false);

  const handleReport = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (reported || userId === currentUserId) return;
    try {
      await fetch("/api/community/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_type: "post", target_id: id, reason: "Flagged by user" }),
      });
      setReported(true);
    } catch {}
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (liked) {
      setScore((s) => s - 1);
      setLiked(false);
      await fetch(`/api/community/posts/${id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction: 0 }),
      });
    } else {
      setScore((s) => s + 1);
      setLiked(true);
      await fetch(`/api/community/posts/${id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction: 1 }),
      });
    }
  };

  return (
    <Link href={`/community/${id}`} className="block">
      <div className="bg-bg-card border border-border rounded-2xl px-5 py-4 press">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-full bg-bg-input flex items-center justify-center text-[13px] font-bold text-text-muted shrink-0">
            {authorName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <Link
                href={`/community/user/${userId}`}
                onClick={(e) => e.stopPropagation()}
                className="text-[14px] font-semibold hover:underline truncate"
              >
                {authorName}
              </Link>
              <span className="text-text-muted text-[13px]">· {timeAgo(createdAt)}</span>
            </div>

            <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words mb-3">{body}</p>

            {recentComments.length > 0 && (
              <div className="mb-3 pl-3 border-l border-border space-y-1.5">
                {recentComments.map((c) => (
                  <div key={c.id} className="text-[13px] leading-snug">
                    <span className="font-medium text-text/90">{c.author_name}</span>
                    <span className="text-text-muted"> </span>
                    <span className="text-text-muted/90 break-words line-clamp-2">{c.body}</span>
                  </div>
                ))}
                {commentCount > recentComments.length && (
                  <p className="text-[12px] text-text-muted/70 pt-0.5">
                    View all {commentCount} comments
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center gap-5 text-text-muted">
              <button onClick={handleLike} className="flex items-center gap-1.5 press">
                <Heart
                  size={16}
                  strokeWidth={1.5}
                  className={liked ? "fill-red-500 text-red-500" : ""}
                />
                <span className={`text-[13px] font-medium ${liked ? "text-red-500" : ""}`}>
                  {score > 0 ? score : ""}
                </span>
              </button>
              <span className="flex items-center gap-1.5">
                <MessageCircle size={16} strokeWidth={1.5} />
                <span className="text-[13px] font-medium">{commentCount > 0 ? commentCount : ""}</span>
              </span>
              {userId !== currentUserId && (
                <button
                  onClick={handleReport}
                  className="ml-auto flex items-center gap-1 press"
                  title={reported ? "Reported" : "Report post"}
                >
                  <Flag
                    size={14}
                    strokeWidth={1.5}
                    className={reported ? "fill-red-400 text-red-400" : "text-text-muted/50"}
                  />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
