"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Sparkles, ArrowUp } from "lucide-react";
import { buildMotivation, derivePlanState, type PlanProfile } from "@/lib/plan";

type ProfileResponse = {
  status: string | null;
  location: string | null;
  blocker: string | null;
  goal: string | null;
  weekly_approach_goal: number | null;
  plan_note: string | null;
  created_at: string | null;
};

type Message = { role: "user" | "assistant"; content: string };

type PlanUpdates = Partial<{
  weekly_approach_goal: number;
  blocker: string;
  location: string;
  status: string;
  plan_note: string;
}>;

// Tolerant parser — the model doesn't always format perfectly. Accepts
// UPDATE, Update, with or without colons, single-quoted or bare values.
function parseUpdates(content: string): PlanUpdates {
  const updates: PlanUpdates = {};
  const regex = /UPDATE[:\s]+(\w+)\s*[=:]\s*([^\n]+)/gi;
  for (const m of content.matchAll(regex)) {
    const field = m[1].trim().toLowerCase();
    let raw = m[2].trim();
    // Strip surrounding quotes/backticks and trailing punctuation.
    raw = raw.replace(/^["'`]|["'`]$/g, "").trim();
    raw = raw.replace(/[.,;]+$/, "").trim();
    if (field === "weekly_approach_goal") {
      const n = parseInt(raw, 10);
      if (!Number.isNaN(n) && n >= 1 && n <= 20) updates.weekly_approach_goal = n;
    } else if (field === "blocker" && ["rejection", "words", "confidence", "time"].includes(raw.toLowerCase())) {
      updates.blocker = raw.toLowerCase();
    } else if (field === "location" && ["city", "suburb", "town", "rural"].includes(raw.toLowerCase())) {
      updates.location = raw.toLowerCase();
    } else if (field === "status" && ["student", "working", "other"].includes(raw.toLowerCase())) {
      updates.status = raw.toLowerCase();
    } else if (field === "plan_note") {
      updates.plan_note = raw.slice(0, 500);
    }
  }
  return updates;
}

function stripUpdates(content: string): string {
  return content.replace(/UPDATE[:\s]+\w+\s*[=:][^\n]*/gi, "").trim();
}

const OPENING_MESSAGE: Message = {
  role: "assistant",
  content:
    "What do you want to change? Your goal, your weekly target, what's holding you back, or your focus line for this week — just tell me.",
};

export default function PlanView() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [messages, setMessages] = useState<Message[]>([OPENING_MESSAGE]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const justUpdatedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.profile) setProfile(d.profile);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => () => {
    if (justUpdatedTimer.current) clearTimeout(justUpdatedTimer.current);
  }, []);

  const profileData: PlanProfile = useMemo(
    () => ({
      status: profile?.status ?? null,
      location: profile?.location ?? null,
      blocker: profile?.blocker ?? null,
      goal: profile?.goal ?? null,
      weekly_approach_goal: profile?.weekly_approach_goal ?? null,
      plan_note: profile?.plan_note ?? null,
    }),
    [profile]
  );

  const motivation = useMemo(() => buildMotivation(profileData), [profileData]);
  const state = useMemo(
    () => derivePlanState(profile?.created_at ?? null),
    [profile?.created_at]
  );

  const applyUpdates = async (updates: PlanUpdates) => {
    if (Object.keys(updates).length === 0) return;
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.profile) {
        setProfile(data.profile);
        setJustUpdated(true);
        if (justUpdatedTimer.current) clearTimeout(justUpdatedTimer.current);
        justUpdatedTimer.current = setTimeout(() => setJustUpdated(false), 2500);
      }
    } catch {}
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || chatLoading) return;

    const userMsg: Message = { role: "user", content: trimmed };
    const history = [...messages, userMsg];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setChatLoading(true);
    if (inputRef.current) inputRef.current.style.height = "auto";

    let assistantContent = "";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, mode: "plan" }),
      });

      if (!res.ok || !res.body) throw new Error("Chat failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              assistantContent += parsed.content;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: assistantContent };
                return updated;
              });
            }
          } catch {}
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Something went wrong — try that again in a second.",
        };
        return updated;
      });
      setChatLoading(false);
      return;
    }
    setChatLoading(false);

    const updates = parseUpdates(assistantContent);
    if (Object.keys(updates).length > 0) applyUpdates(updates);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasChatted = messages.some((m) => m.role === "user");

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-muted mb-1">
          When your heart's pounding
        </p>
        <h1 className="font-display text-[28px] font-extrabold tracking-tight leading-[1.05]">
          Your Plan
        </h1>
      </div>

      {/* Minimal 4-week timeline — reminder of where you are in the run */}
      <div className="flex items-center gap-1.5 mb-4">
        {[1, 2, 3, 4].map((n) => {
          const isCurrent = n === state.currentWeek && !state.graduated;
          const isPast = n < state.currentWeek || (state.graduated && n <= 4);
          return (
            <div key={n} className="flex-1 flex items-center gap-1.5">
              <div
                className={`h-1 flex-1 rounded-full ${
                  isPast || isCurrent ? "bg-[#1a1a1a]" : "bg-border"
                }`}
              />
            </div>
          );
        })}
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted ml-1">
          {state.graduated
            ? `Wk 4+ · ${motivation.weeklyTarget}/wk`
            : `Wk ${state.currentWeek}/4 · ${motivation.weeklyTarget}/wk`}
        </span>
      </div>

      {/* Compact motivational card — designed to fit on one screen. */}
      <div
        className={`bg-bg-card border border-border rounded-2xl shadow-card p-5 mb-5 transition-all ${
          justUpdated ? "ring-2 ring-green-400" : ""
        }`}
      >
        {/* Why */}
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-muted mb-1.5">
          Why
        </p>
        <p className="font-display text-[18px] font-extrabold leading-snug mb-1">
          {motivation.why}
        </p>
        <p className="text-[13px] text-text-muted mb-4">
          Your target this week · <span className="text-text font-semibold">{motivation.weeklyTarget} girls</span>
        </p>

        <div className="h-px bg-border my-4" />

        {/* Fear → Truth */}
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-muted mb-1.5">
          Before you walk away
        </p>
        <p className="font-display text-[15px] italic text-text-muted mb-1.5">
          {motivation.lie}
        </p>
        <p className="text-[15px] font-semibold leading-snug">
          {motivation.truth}
        </p>

        {motivation.focus && (
          <>
            <div className="h-px bg-border my-4" />
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-orange-500 mb-1.5">
              Your move
            </p>
            <p className="text-[15px] font-semibold leading-snug">
              {motivation.focus}
            </p>
          </>
        )}

        <div className="h-px bg-border my-4" />

        <p className="text-center font-display text-[22px] font-extrabold tracking-tight">
          GO.
        </p>
      </div>

      {/* Chat */}
      <div className="bg-bg-card/50 border border-border/60 rounded-2xl p-3">
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="w-6 h-6 rounded-full bg-[#1a1a1a] flex items-center justify-center shrink-0">
            <Sparkles size={12} strokeWidth={2.5} className="text-white" />
          </div>
          <p className="text-[12px] font-bold tracking-wide">Chat with Wingmate</p>
          <span className="text-[11px] text-text-muted ml-1">· change your plan</span>
          {justUpdated && (
            <span className="ml-auto text-[11px] font-semibold text-green-600 flex items-center gap-1">
              <Check size={11} strokeWidth={3} /> Plan updated
            </span>
          )}
        </div>

        <div className="space-y-2.5 mb-3">
          {messages.map((m, i) => {
            if (m.role === "user") {
              return (
                <div key={i} className="flex justify-end">
                  <div className="bg-[#1a1a1a] text-white rounded-2xl rounded-br-sm px-3.5 py-2.5 max-w-[85%] text-[14px] leading-[1.5]">
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                </div>
              );
            }
            const display = stripUpdates(m.content);
            if (!display && !chatLoading) return null;
            return (
              <div key={i} className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-[#1a1a1a] flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles size={12} strokeWidth={2.5} className="text-white" />
                </div>
                <div className="bg-bg-card border border-border/60 rounded-2xl rounded-bl-sm px-3.5 py-2.5 max-w-[88%] text-[14px] leading-[1.5]">
                  <p className="whitespace-pre-wrap">{display}</p>
                </div>
              </div>
            );
          })}
          {chatLoading &&
            messages[messages.length - 1]?.role === "assistant" &&
            messages[messages.length - 1]?.content === "" && (
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-[#1a1a1a] flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles size={12} strokeWidth={2.5} className="text-white" />
                </div>
                <div className="bg-bg-card border border-border/60 rounded-2xl rounded-bl-sm px-3.5 py-3">
                  <div className="flex gap-1">
                    <div
                      className="w-1.5 h-1.5 rounded-full bg-orange-400/60 animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <div
                      className="w-1.5 h-1.5 rounded-full bg-orange-400/60 animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <div
                      className="w-1.5 h-1.5 rounded-full bg-orange-400/60 animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex items-end gap-2 bg-bg border border-border rounded-2xl pl-4 pr-2 py-2"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleTextareaInput}
            onKeyDown={handleKeyDown}
            placeholder={hasChatted ? "Type your reply..." : "Type your reply here..."}
            rows={1}
            maxLength={2000}
            className="flex-1 bg-transparent text-text text-[15px] placeholder-text-muted/60 focus:outline-none resize-none leading-normal py-1 min-w-0"
            disabled={chatLoading}
          />
          <button
            type="submit"
            disabled={chatLoading || !input.trim()}
            className="bg-[#1a1a1a] disabled:opacity-15 text-white p-2.5 rounded-xl press shrink-0 transition-opacity"
          >
            <ArrowUp size={16} strokeWidth={2.5} />
          </button>
        </form>
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
