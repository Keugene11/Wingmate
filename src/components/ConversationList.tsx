"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Plus, MessageCircle, ChevronRight } from "lucide-react";
import { timeAgo } from "@/lib/time";

interface Conversation {
  id: string;
  preview: string | null;
  mode: string;
  created_at: string;
  updated_at: string;
}

export default function ConversationList({
  onBack,
  onSelectConversation,
  onNewChat,
}: {
  onBack: () => void;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/conversations")
      .then((res) => res.json())
      .then((data) => {
        setConversations(data.conversations || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col h-[calc(100dvh-4.5rem)] bg-bg animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-4">
        <button onClick={onBack} className="text-text-muted press p-1.5 rounded-full hover:bg-bg-card-hover transition-colors">
          <ArrowLeft size={18} strokeWidth={2} />
        </button>
        <h1 className="font-display text-[18px] font-bold">Past chats</h1>
        <button
          onClick={onNewChat}
          className="flex items-center gap-1.5 bg-[#1a1a1a] text-white px-3.5 py-2 rounded-full press text-[13px] font-medium"
        >
          <Plus size={14} strokeWidth={2.5} />
          New
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {loading ? (
          <div className="space-y-3 pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-bg-card border border-border rounded-2xl shadow-card h-[72px] animate-pulse" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-24 text-center">
            <div className="w-16 h-16 rounded-full bg-bg-card-hover flex items-center justify-center mb-4">
              <MessageCircle size={28} strokeWidth={1.5} className="text-text-muted" />
            </div>
            <h2 className="font-display text-[18px] font-bold mb-2">No conversations yet</h2>
            <p className="text-text-muted text-[14px] leading-relaxed mb-6 max-w-[260px]">
              Start a chat with your AI wingmate to get hyped up for your next approach.
            </p>
            <button
              onClick={onNewChat}
              className="px-6 py-3 bg-[#1a1a1a] text-white rounded-xl font-medium text-[14px] press"
            >
              Start a conversation
            </button>
          </div>
        ) : (
          <div className="space-y-2 pt-1">
            {conversations.map((convo) => (
              <button
                key={convo.id}
                onClick={() => onSelectConversation(convo.id)}
                className="w-full flex items-center gap-3 bg-bg-card border border-border rounded-2xl shadow-card px-4 py-3.5 text-left press"
              >
                <div className="w-10 h-10 rounded-full bg-bg-card-hover flex items-center justify-center shrink-0">
                  <MessageCircle size={18} strokeWidth={1.5} className="text-text-muted" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium truncate">
                    {convo.preview || "New conversation"}
                  </p>
                  <p className="text-[12px] text-text-muted mt-0.5">
                    {timeAgo(convo.updated_at)}
                  </p>
                </div>
                <ChevronRight size={16} className="text-border shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
