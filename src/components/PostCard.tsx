"use client";

import { useState } from "react";
import { Heart, MessageCircle } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { timeAgo } from "@/lib/time";

interface PostCardProps {
  id: string;
  title: string;
  body: string;
  authorName: string;
  score: number;
  commentCount: number;
  createdAt: string;
  userId: string;
  currentUserId: string;
  currentVote: number | null;
}

export default function PostCard({
  id,
  title,
  body,
  authorName,
  score: initialScore,
  commentCount,
  createdAt,
  userId,
  currentUserId,
  currentVote: initialVote,
}: PostCardProps) {
  const [score, setScore] = useState(initialScore);
  const [liked, setLiked] = useState(initialVote === 1);
  const supabase = createClient();

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (liked) {
      setScore((s) => s - 1);
      setLiked(false);
      await supabase.from("votes").delete().eq("post_id", id).eq("user_id", currentUserId);
    } else {
      setScore((s) => s + 1);
      setLiked(true);
      await supabase.from("votes").upsert(
        { user_id: currentUserId, post_id: id, direction: 1 },
        { onConflict: "user_id,post_id" }
      );
    }
  };

  return (
    <Link href={`/community/${id}`} className="block">
      <div className="bg-bg-card border border-border rounded-2xl px-5 py-4 press">
        {/* Author + time */}
        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-7 h-7 rounded-full bg-bg-input flex items-center justify-center text-[12px] font-bold text-text-muted">
            {authorName.charAt(0).toUpperCase()}
          </div>
          <Link
            href={`/community/user/${userId}`}
            onClick={(e) => e.stopPropagation()}
            className="text-[14px] font-semibold hover:underline"
          >
            {authorName}
          </Link>
          <span className="text-text-muted text-[13px]">· {timeAgo(createdAt)}</span>
        </div>

        {/* Content */}
        <h3 className="font-semibold text-[15px] leading-snug mb-1">{title}</h3>
        <p className="text-text-muted text-[14px] leading-relaxed line-clamp-3 mb-3">{body}</p>

        {/* Actions */}
        <div className="flex items-center gap-5 text-text-muted">
          <button
            onClick={handleLike}
            className="flex items-center gap-1.5 press"
          >
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
        </div>
      </div>
    </Link>
  );
}
