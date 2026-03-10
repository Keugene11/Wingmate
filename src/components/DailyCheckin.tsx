"use client";

import { useState, useEffect } from "react";
import { Flame, Check, X, MessageCircle, Trophy, TrendingUp, Calendar, Shield, Target, ThumbsUp, ThumbsDown, UserX } from "lucide-react";
import { getFlameLevel } from "@/lib/gamification";

interface CheckinData {
  checkedInToday: boolean;
  talked: boolean | null;
  note: string | null;
  approachesCount: number;
  successesCount: number;
  streak: number;
  bestStreak: number;
  totalCheckins: number;
  totalTalked: number;
  approachRate: number;
  totalApproaches: number;
  totalSuccesses: number;
  totalFailures: number;
  totalDidntApproach: number;
  successRate: number;
  last7: { date: string; talked: boolean | null }[];
  history: { date: string; talked: boolean; note: string | null }[];
  streakFreezes: number;
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function formatHistoryDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - date.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function DailyCheckin({ onTalkAboutIt, onCheckedIn }: { onTalkAboutIt: (talked: boolean) => void; onCheckedIn?: () => void }) {
  const [data, setData] = useState<CheckinData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [justCheckedIn, setJustCheckedIn] = useState(false);
  const [noteInput, setNoteInput] = useState("");
  const [showNoteField, setShowNoteField] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [approachStep, setApproachStep] = useState<"count" | "success" | null>(null);
  const [approachCount, setApproachCount] = useState(1);
  const [successCount, setSuccessCount] = useState(0);

  useEffect(() => {
    fetch("/api/checkin")
      .then((res) => res.json())
      .then(setData)
      .catch(() => {});
  }, []);

  const handleCheckin = async (talked: boolean) => {
    if (submitting) return;

    if (talked) {
      // Show approach count flow instead of submitting immediately
      setApproachStep("count");
      setApproachCount(1);
      setSuccessCount(0);
      return;
    }

    await submitCheckin(talked, 0, 0);
  };

  const submitCheckin = async (talked: boolean, approaches: number, successes: number) => {
    setSubmitting(true);
    setApproachStep(null);

    const res = await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ talked, approachesCount: approaches, successesCount: successes }),
    });
    const result = await res.json();

    setData((prev) =>
      prev
        ? {
            ...prev,
            checkedInToday: true,
            talked,
            approachesCount: approaches,
            successesCount: successes,
            streak: result.streak,
            bestStreak: result.bestStreak,
            totalCheckins: result.totalCheckins,
            totalTalked: result.totalTalked,
            approachRate: result.approachRate,
            totalApproaches: result.totalApproaches,
            totalSuccesses: result.totalSuccesses,
            totalFailures: result.totalFailures,
            totalDidntApproach: result.totalDidntApproach,
            successRate: result.successRate,
            last7: prev.last7.map((d, i) =>
              i === prev.last7.length - 1 ? { ...d, talked } : d
            ),
          }
        : prev
    );
    setJustCheckedIn(true);
    setShowNoteField(true);
    setSubmitting(false);
    onCheckedIn?.();
  };

  const saveNote = async () => {
    if (!noteInput.trim()) return;
    await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        talked: data?.talked,
        note: noteInput.trim(),
        approachesCount: data?.approachesCount,
        successesCount: data?.successesCount,
      }),
    });
    setData((prev) => prev ? { ...prev, note: noteInput.trim() } : prev);
    setNoteSaved(true);
    setShowNoteField(false);
  };

  if (!data) {
    return (
      <div className="space-y-4">
        <div className="bg-bg-card border border-border rounded-2xl h-48 animate-pulse" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="bg-bg-card border border-border rounded-xl h-20 animate-pulse" />)}
        </div>
      </div>
    );
  }

  const flame = getFlameLevel(data.streak);

  return (
      <div className="space-y-4">
        {/* Main check-in card */}
        <div className={`bg-bg-card border border-border rounded-2xl px-5 py-5 ${justCheckedIn ? "animate-fade-in" : ""}`}>
          {!data.checkedInToday ? (
            <>
              {!approachStep ? (
                <>
                  <div className="text-center mb-5">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${flame.bgColor}`}>
                      <Flame size={flame.size} strokeWidth={1.5} className={flame.color} />
                    </div>
                    <h2 className="font-display text-[18px] font-bold mb-1">Daily check-in</h2>
                    <p className="text-text-muted text-[14px]">Did you talk to someone new today?</p>
                  </div>

                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => handleCheckin(true)}
                      disabled={submitting}
                      className="flex-1 py-3.5 rounded-xl bg-[#1a1a1a] text-white text-[15px] font-medium press"
                    >
                      Yes, I did
                    </button>
                    <button
                      onClick={() => handleCheckin(false)}
                      disabled={submitting}
                      className="flex-1 py-3.5 rounded-xl bg-bg-card-hover border border-border text-[15px] font-medium press"
                    >
                      Not yet
                    </button>
                  </div>
                </>
              ) : approachStep === "count" ? (
                <div className="text-center animate-fade-in">
                  <h2 className="font-display text-[18px] font-bold mb-1">How many people did you approach?</h2>
                  <p className="text-text-muted text-[13px] mb-5">Count every conversation you initiated</p>

                  <div className="flex items-center justify-center gap-5 mb-6">
                    <button
                      onClick={() => setApproachCount(Math.max(1, approachCount - 1))}
                      className="w-11 h-11 rounded-full bg-bg-card-hover border border-border flex items-center justify-center text-[20px] font-bold press"
                    >
                      −
                    </button>
                    <span className="font-display text-[48px] font-extrabold leading-none w-16 text-center">{approachCount}</span>
                    <button
                      onClick={() => setApproachCount(approachCount + 1)}
                      className="w-11 h-11 rounded-full bg-bg-card-hover border border-border flex items-center justify-center text-[20px] font-bold press"
                    >
                      +
                    </button>
                  </div>

                  <button
                    onClick={() => { setApproachStep("success"); setSuccessCount(0); }}
                    className="w-full py-3.5 rounded-xl bg-[#1a1a1a] text-white text-[15px] font-medium press"
                  >
                    Next
                  </button>
                </div>
              ) : (
                <div className="text-center animate-fade-in">
                  <h2 className="font-display text-[18px] font-bold mb-1">How many went well?</h2>
                  <p className="text-text-muted text-[13px] mb-5">Got a number, a date, or a good convo</p>

                  <div className="flex items-center justify-center gap-5 mb-6">
                    <button
                      onClick={() => setSuccessCount(Math.max(0, successCount - 1))}
                      className="w-11 h-11 rounded-full bg-bg-card-hover border border-border flex items-center justify-center text-[20px] font-bold press"
                    >
                      −
                    </button>
                    <span className="font-display text-[48px] font-extrabold leading-none w-16 text-center">{successCount}</span>
                    <button
                      onClick={() => setSuccessCount(Math.min(approachCount, successCount + 1))}
                      className="w-11 h-11 rounded-full bg-bg-card-hover border border-border flex items-center justify-center text-[20px] font-bold press"
                    >
                      +
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setApproachStep("count")}
                      className="flex-1 py-3.5 rounded-xl bg-bg-card-hover border border-border text-[15px] font-medium press"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => submitCheckin(true, approachCount, successCount)}
                      disabled={submitting}
                      className="flex-1 py-3.5 rounded-xl bg-[#1a1a1a] text-white text-[15px] font-medium press disabled:opacity-60"
                    >
                      {submitting ? "..." : "Submit"}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="text-center mb-4">
                <div className={`w-18 h-18 rounded-full flex items-center justify-center mx-auto mb-3 ${flame.bgColor} ${justCheckedIn ? "streak-pop" : ""}`}
                  style={{ width: 72, height: 72 }}>
                  <Flame size={flame.size} strokeWidth={1.5} className={flame.color} />
                </div>
                <p className="font-display text-[40px] font-extrabold leading-none mb-0.5">{data.streak}</p>
                <p className="text-text-muted text-[14px]">day streak</p>
              </div>
            </>
          )}

          {/* 7-day dots */}
          <div className="flex justify-between px-1">
            {data.last7.map((day, i) => {
              const dayOfWeek = new Date(day.date + "T00:00:00").getDay();
              const isToday = i === data.last7.length - 1;
              return (
                <div key={day.date} className="flex flex-col items-center gap-1.5">
                  <span className={`text-[10px] font-medium ${isToday ? "text-text" : "text-text-muted"}`}>
                    {DAY_LABELS[dayOfWeek]}
                  </span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    day.talked === true
                      ? "bg-green-500 text-white"
                      : day.talked === false
                      ? "bg-orange-100 text-orange-600"
                      : isToday
                      ? "border-2 border-dashed border-text-muted/30"
                      : "bg-bg-card-hover"
                  } ${justCheckedIn && isToday ? "streak-pop" : ""}`}>
                    {day.talked === true ? <Check size={14} strokeWidth={2.5} /> : day.talked === false ? <X size={14} strokeWidth={2.5} /> : null}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Streak freeze indicator */}
          {data.streakFreezes > 0 && (
            <div className="flex items-center justify-center gap-1.5 mt-3 text-[12px] text-text-muted">
              <Shield size={12} strokeWidth={1.5} className="text-blue-400" />
              {data.streakFreezes} streak freeze{data.streakFreezes !== 1 ? "s" : ""} banked
            </div>
          )}

          {/* Note field */}
          {showNoteField && !noteSaved && (
            <div className="mt-4 animate-fade-in">
              <textarea
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value.slice(0, 280))}
                placeholder={data.talked ? "How did it go? What did you say?" : "What held you back today?"}
                rows={2}
                className="w-full bg-bg-card-hover border border-border rounded-xl px-4 py-3 text-[14px] leading-relaxed placeholder:text-text-muted/50 outline-none focus:border-text-muted transition-colors resize-none"
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-[11px] text-text-muted">{noteInput.length}/280</span>
                <div className="flex gap-2">
                  <button onClick={() => setShowNoteField(false)} className="text-[13px] text-text-muted press px-3 py-1.5">Skip</button>
                  <button
                    onClick={saveNote}
                    disabled={!noteInput.trim()}
                    className={`text-[13px] font-medium press px-4 py-1.5 rounded-full transition-opacity ${
                      noteInput.trim() ? "bg-[#1a1a1a] text-white" : "bg-border text-text-muted opacity-50"
                    }`}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Talk about it */}
          {data.checkedInToday && !showNoteField && (
            <button
              onClick={() => onTalkAboutIt(data.talked!)}
              className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-bg-card-hover text-[14px] font-medium press"
            >
              <MessageCircle size={16} strokeWidth={1.5} />
              {data.talked ? "Tell me how it went" : "Let's talk about what's holding you back"}
            </button>
          )}
        </div>

        {/* Approach stats */}
        <div className="bg-bg-card border border-border rounded-2xl px-5 py-4">
          <h3 className="text-[13px] font-semibold text-text-muted uppercase tracking-wide mb-3">Approach stats</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-bg-card-hover rounded-xl px-3 py-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Target size={14} strokeWidth={1.5} className="text-blue-500" />
                <span className="font-display text-[22px] font-bold">{data.totalApproaches}</span>
              </div>
              <p className="text-[11px] text-text-muted">Total approaches</p>
            </div>
            <div className="bg-bg-card-hover rounded-xl px-3 py-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <ThumbsUp size={14} strokeWidth={1.5} className="text-green-500" />
                <span className="font-display text-[22px] font-bold">{data.totalSuccesses}</span>
              </div>
              <p className="text-[11px] text-text-muted">Succeeded</p>
            </div>
            <div className="bg-bg-card-hover rounded-xl px-3 py-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <ThumbsDown size={14} strokeWidth={1.5} className="text-red-400" />
                <span className="font-display text-[22px] font-bold">{data.totalFailures}</span>
              </div>
              <p className="text-[11px] text-text-muted">Didn&apos;t work out</p>
            </div>
            <div className="bg-bg-card-hover rounded-xl px-3 py-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <TrendingUp size={14} strokeWidth={1.5} className="text-orange-500" />
                <span className="font-display text-[22px] font-bold">{data.successRate}%</span>
              </div>
              <p className="text-[11px] text-text-muted">Success rate</p>
            </div>
          </div>
        </div>

        {/* Quick stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-bg-card border border-border rounded-xl px-3 py-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Trophy size={13} strokeWidth={1.5} className="text-orange-500" />
              <span className="font-display text-[20px] font-bold">{data.bestStreak}</span>
            </div>
            <p className="text-[11px] text-text-muted">Best streak</p>
          </div>
          <div className="bg-bg-card border border-border rounded-xl px-3 py-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Calendar size={13} strokeWidth={1.5} className="text-text-muted" />
              <span className="font-display text-[20px] font-bold">{data.totalCheckins}</span>
            </div>
            <p className="text-[11px] text-text-muted">Total days</p>
          </div>
          <div className="bg-bg-card border border-border rounded-xl px-3 py-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <UserX size={13} strokeWidth={1.5} className="text-text-muted" />
              <span className="font-display text-[20px] font-bold">{data.totalDidntApproach}</span>
            </div>
            <p className="text-[11px] text-text-muted">Days skipped</p>
          </div>
        </div>

        {/* History */}
        {data.history.length > 0 && (
          <div>
            <h3 className="text-[13px] font-semibold text-text-muted uppercase tracking-wide mb-3 px-1">
              Recent activity
            </h3>
            <div className="space-y-2">
              {data.history.map((entry) => (
                <div key={entry.date} className="flex items-start gap-3 bg-bg-card border border-border rounded-xl px-4 py-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    entry.talked ? "bg-green-500 text-white" : "bg-orange-100 text-orange-600"
                  }`}>
                    {entry.talked ? <Check size={13} strokeWidth={2.5} /> : <X size={13} strokeWidth={2.5} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[13px] font-medium">{entry.talked ? "Talked to someone" : "Checked in"}</span>
                      <span className="text-[12px] text-text-muted">{formatHistoryDate(entry.date)}</span>
                    </div>
                    {entry.note && <p className="text-[13px] text-text-muted leading-relaxed">{entry.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Streak at risk */}
        {data.streak > 0 && !data.checkedInToday && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-center">
            <p className="text-[14px] font-medium text-orange-700">
              Your {data.streak}-day streak is at risk! Check in to keep it alive.
            </p>
          </div>
        )}
      </div>
  );
}
