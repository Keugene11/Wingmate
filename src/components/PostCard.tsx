"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown, MessageCircle } from "lucide-react";
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
  const [vote, setVote] = useState<number | null>(initialVote);
  const supabase = createClient();

  const handleVote = async (e: React.MouseEvent, direction: 1 | -1) => {
    e.preventDefault();
    e.stopPropagation();

    if (vote === direction) {
      setScore((s) => s - direction);
      setVote(null);
      await supabase.from("votes").delete().eq("post_id", id).eq("user_id", currentUserId);
    } else {
      const adjustment = vote ? direction * 2 : direction;
      setScore((s) => s + adjustment);
      setVote(direction);
      await supabase.from("votes").upsert(
        { user_id: currentUserId, post_id: id, direction },
        { onConflict: "user_id,post_id" }
      );
    }
  };

  return (
    <Link href={`/community/${id}`} className="block">
      <div className="flex gap-3 bg-bg-card border border-border rounded-xl shadow-card px-4 py-3.5 press">
        <div className="flex flex-col items-center gap-0.5 shrink-0 pt-0.5">
          <button
            onClick={(e) => handleVote(e, 1)}
            className={`p-0.5 rounded ${vote === 1 ? "text-orange-500" : "text-text-muted"}`}
          >
            <ChevronUp size={18} strokeWidth={2} />
          </button>
          <span className={`text-[13px] font-semibold tabular-nums ${score > 0 ? "text-orange-500" : score < 0 ? "text-blue-500" : "text-text-muted"}`}>
            {score}
          </span>
          <button
            onClick={(e) => handleVote(e, -1)}
            className={`p-0.5 rounded ${vote === -1 ? "text-blue-500" : "text-text-muted"}`}
          >
            <ChevronDown size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[15px] leading-snug mb-1 line-clamp-2">{title}</h3>
          <p className="text-text-muted text-[13px] leading-relaxed line-clamp-2 mb-2">{body}</p>
          <div className="flex items-center gap-3 text-[12px] text-text-muted">
            <Link
              href={`/community/user/${userId}`}
              onClick={(e) => e.stopPropagation()}
              className="hover:underline"
            >
              {authorName}
            </Link>
            <span>·</span>
            <span>{timeAgo(createdAt)}</span>
            <span className="ml-auto flex items-center gap-1">
              <MessageCircle size={12} strokeWidth={1.5} />
              {commentCount}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
