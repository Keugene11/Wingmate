"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Sparkles, ArrowUp } from "lucide-react";
import { buildWeek, derivePlanState, type PlanProfile } from "@/lib/plan";

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

function extractFocusLine(content: string): string | null {
  const m = content.match(/FOCUS:\s*(.+?)(?:\n|$)/i);
  if (!m) return null;
  const focus = m[1].trim().replace(/^["']|["']$/g, "");
  return focus.length > 0 ? focus.slice(0, 500) : null;
}

const OPENING_MESSAGE: Message = {
  role: "assistant",
  content:
    "What do you want to change about your plan? Tell me what's not clicking for you — the number, the spots, the blocker, or something else that's actually going on.",
};

export default function PlanView() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [messages, setMessages] = useState<Message[]>([OPENING_MESSAGE]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [savingFocus, setSavingFocus] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.profile) setProfile(d.profile);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const profileData: PlanProfile = useMemo(
    () => ({
      status: profile?.status ?? null,
      location: profile?.location ?? null,
      blocker: profile?.blocker ?? null,
      goal: profile?.goal ?? null,
      weekly_approach_goal: profile?.weekly_approach_goal ?? null,
    }),
    [profile]
  );

  const state = useMemo(
    () => derivePlanState(profile?.created_at ?? null),
    [profile?.created_at]
  );

  const weeks = useMemo(
    () => [1, 2, 3, 4].map((n) => buildWeek(n as 1 | 2 | 3 | 4, profileData)),
    [profileData]
  );

  const pendingFocus = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === "assistant" && m.content) {
        const f = extractFocusLine(m.content);
        if (f) return f;
        break;
      }
    }
    return null;
  }, [messages]);

  const saveFocus = async () => {
    if (!pendingFocus || savingFocus) return;
    setSavingFocus(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_note: pendingFocus }),
      });
      const data = await res.json();
      if (data.profile) setProfile(data.profile);
    } catch {}
    setSavingFocus(false);
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

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, mode: "plan" }),
      });

      if (!res.ok || !res.body) throw new Error("Chat failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

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
    }
    setChatLoading(false);
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

  const week = weeks[state.currentWeek - 1];
  const focus = profile?.plan_note?.trim() || "";

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-5">
        <h1 className="font-display text-[28px] font-bold tracking-tight leading-[1.2] mb-1">
          Your Plan
        </h1>
        <p className="text-text-muted text-[14px]">
          {state.graduated
            ? "You've made it through the 4 weeks. Keep going."
            : `Week ${state.currentWeek} of 4 · day ${state.daysIntoWeek + 1}`}
        </p>
      </div>

      {/* Week timeline */}
      <div className="flex items-start gap-2 mb-5">
        {weeks.map((w) => {
          const isCurrent = w.number === state.currentWeek && !state.graduated;
          const isPast = w.number < state.currentWeek || (state.graduated && w.number <= 4);
          return (
            <div key={w.number} className="flex-1">
              <div
                className={`h-1.5 rounded-full ${
                  isPast ? "bg-[#1a1a1a]" : isCurrent ? "bg-[#1a1a1a]" : "bg-border"
                }`}
              />
              <div className="flex items-center gap-1 mt-2">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    isCurrent ? "text-text" : "text-text-muted/60"
                  }`}
                >
                  W{w.number}
                </span>
                {isPast && !isCurrent && (
                  <Check size={10} strokeWidth={3} className="text-[#1a1a1a]" />
                )}
              </div>
              <p
                className={`text-[11px] leading-tight mt-0.5 ${
                  isCurrent ? "text-text font-medium" : "text-text-muted/60"
                }`}
              >
                {w.heading}
              </p>
            </div>
          );
        })}
      </div>

      {/* Focus (if set) */}
      {focus && (
        <div className="bg-[#1a1a1a] text-white rounded-2xl px-4 py-3.5 mb-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/60 mb-1">
            Your focus
          </p>
          <p className="text-[14px] leading-snug">{focus}</p>
        </div>
      )}

      {/* Current week card */}
      <div className="bg-bg-card border border-border rounded-2xl shadow-card p-4 mb-5">
        <h2 className="font-display text-[20px] font-bold leading-tight mb-1.5">
          {week.heading}
        </h2>
        <p className="text-text/75 text-[13.5px] leading-snug mb-4">{week.why}</p>

        <ul className="space-y-1.5 mb-4">
          {week.tasks.map((task, i) => (
            <li
              key={i}
              className="text-[13.5px] leading-snug text-text/90 flex gap-2"
            >
              <span className="text-text-muted shrink-0">·</span>
              <span>{task}</span>
            </li>
          ))}
        </ul>

        <div className="bg-bg-input rounded-lg px-3 py-2">
          <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wide mb-0.5">
            End of week
          </p>
          <p className="text-[13px] leading-snug font-medium">{week.endOfWeek}</p>
        </div>
      </div>

      {/* Refine section */}
      <div className="mb-2">
        <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wide mb-3">
          Refine your plan
        </p>

        {/* Messages */}
        <div className="space-y-2.5 mb-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : ""}`}
            >
              <div
                className={`rounded-2xl px-3.5 py-2.5 text-[14px] leading-[1.5] ${
                  m.role === "user"
                    ? "bg-[#1a1a1a] text-white max-w-[85%] rounded-br-sm"
                    : "bg-bg-card border border-border/60 max-w-[92%] rounded-bl-sm"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            </div>
          ))}
          {chatLoading &&
            messages[messages.length - 1]?.role === "assistant" &&
            messages[messages.length - 1]?.content === "" && (
              <div className="flex">
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

        {/* Save focus button (appears when coach emits a FOCUS: line) */}
        {pendingFocus && (
          <button
            onClick={saveFocus}
            disabled={savingFocus || pendingFocus === focus}
            className="w-full flex items-center justify-center gap-2 bg-[#1a1a1a] text-white rounded-2xl py-3 press disabled:opacity-60 mb-3"
          >
            <Sparkles size={14} strokeWidth={2} />
            <span className="text-[13.5px] font-semibold truncate px-2">
              {savingFocus
                ? "Saving..."
                : pendingFocus === focus
                ? "Saved as your focus"
                : `Save as my focus: "${pendingFocus.length > 40 ? pendingFocus.slice(0, 40) + "..." : pendingFocus}"`}
            </span>
          </button>
        )}

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="flex items-end gap-2 bg-bg-card border border-border rounded-2xl shadow-card pl-4 pr-2 py-2"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleTextareaInput}
            onKeyDown={handleKeyDown}
            placeholder={messages.some((m) => m.role === "user") ? "Keep going..." : "What do you want to change..."}
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
      </div>

      {/* Footer note */}
      {!state.graduated && state.currentWeek < 4 && (
        <p className="text-center text-[12px] text-text-muted mt-4">
          Week {state.currentWeek + 1} unlocks in {7 - state.daysIntoWeek}{" "}
          {7 - state.daysIntoWeek === 1 ? "day" : "days"}.
        </p>
      )}
    </div>
  );
}
