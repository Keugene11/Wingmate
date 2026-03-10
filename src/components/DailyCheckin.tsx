"use client";

import { useState, useEffect } from "react";
import { Flame, Check, X, MessageCircle, Trophy, TrendingUp, Calendar, Shield, Target, ThumbsUp, ThumbsDown, UserX, Pencil } from "lucide-react";
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
  history: { date: string; talked: boolean; note: string | null; approaches: number; successes: number }[];
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
  const [editing, setEditing] = useState(false);
  const [editApproaches, setEditApproaches] = useState(0);
  const [editSuccesses, setEditSuccesses] = useState(0);
  const [editingTotals, setEditingTotals] = useState(false);
  const [editTotalApproaches, setEditTotalApproaches] = useState(0);
  const [editTotalSuccesses, setEditTotalSuccesses] = useState(0);
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [editDayApproaches, setEditDayApproaches] = useState(0);
  const [editDaySuccesses, setEditDaySuccesses] = useState(0);
  const [todayApproaches, setTodayApproaches] = useState<number | null>(null);
  const [todaySuccesses, setTodaySuccesses] = useState<number | null>(null);
  const [savingToday, setSavingToday] = useState(false);

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

  const startEditing = () => {
    setEditApproaches(data?.approachesCount ?? 0);
    setEditSuccesses(data?.successesCount ?? 0);
    setEditing(true);
  };

  const saveEdit = async () => {
    const talked = editApproaches > 0;
    setSubmitting(true);

    const res = await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        talked,
        approachesCount: editApproaches,
        successesCount: editSuccesses,
        note: data?.note,
      }),
    });
    const result = await res.json();

    setData((prev) =>
      prev
        ? {
            ...prev,
            talked,
            approachesCount: editApproaches,
            successesCount: editSuccesses,
            totalApproaches: result.totalApproaches,
            totalSuccesses: result.totalSuccesses,
            totalFailures: result.totalFailures,
            totalDidntApproach: result.totalDidntApproach,
            successRate: result.successRate,
            totalTalked: result.totalTalked,
            approachRate: result.approachRate,
            last7: prev.last7.map((d, i) =>
              i === prev.last7.length - 1 ? { ...d, talked } : d
            ),
          }
        : prev
    );
    setEditing(false);
    setSubmitting(false);
  };

  const startEditingTotals = () => {
    setEditTotalApproaches(data?.totalApproaches ?? 0);
    setEditTotalSuccesses(data?.totalSuccesses ?? 0);
    setEditingTotals(true);
  };

  const saveTotals = async () => {
    setSubmitting(true);
    const res = await fetch("/api/checkin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        totalApproaches: editTotalApproaches,
        totalSuccesses: editTotalSuccesses,
      }),
    });
    const result = await res.json();
    setData((prev) =>
      prev
        ? {
            ...prev,
            totalApproaches: result.totalApproaches,
            totalSuccesses: result.totalSuccesses,
            totalFailures: result.totalFailures,
            totalDidntApproach: result.totalDidntApproach,
            successRate: result.successRate,
            approachesCount: result.approachesCount,
            successesCount: result.successesCount,
          }
        : prev
    );
    setEditingTotals(false);
    setSubmitting(false);
  };

  const saveToday = async () => {
    if (todayApproaches === null) return;
    const today = new Date().toISOString().split("T")[0];
    const approaches = todayApproaches;
    const successes = todaySuccesses ?? 0;
    setSavingToday(true);
    try {
      const res = await fetch("/api/checkin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today, approaches, successes }),
      });
      const result = await res.json();
      setData((prev) =>
        prev ? {
          ...prev,
          approachesCount: approaches,
          successesCount: successes,
          totalApproaches: result.totalApproaches,
          totalSuccesses: result.totalSuccesses,
          totalFailures: result.totalFailures,
          totalDidntApproach: result.totalDidntApproach,
          successRate: result.successRate,
          history: result.history || prev.history,
        } : prev
      );
      setTodayApproaches(null);
      setTodaySuccesses(null);
    } catch {}
    setSavingToday(false);
  };

  const startEditingDay = (date: string, approaches: number, successes: number) => {
    setEditDayApproaches(approaches);
    setEditDaySuccesses(successes);
    setEditingDay(date);
  };

  const saveDay = async () => {
    if (!editingDay) return;
    setSubmitting(true);
    const res = await fetch("/api/checkin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: editingDay,
        approaches: editDayApproaches,
        successes: editDaySuccesses,
      }),
    });
    const result = await res.json();
    setData((prev) =>
      prev
        ? {
            ...prev,
            totalApproaches: result.totalApproaches,
            totalSuccesses: result.totalSuccesses,
            totalFailures: result.totalFailures,
            totalDidntApproach: result.totalDidntApproach,
            successRate: result.successRate,
            history: result.history || prev.history.map((h) =>
              h.date === editingDay
                ? { ...h, approaches: editDayApproaches, successes: editDaySuccesses, talked: editDayApproaches > 0 }
                : h
            ),
          }
        : prev
    );
    setEditingDay(null);
    setSubmitting(false);
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
          ) : editing ? (
            <div className="text-center animate-fade-in">
              <h2 className="font-display text-[18px] font-bold mb-1">Edit today&apos;s check-in</h2>
              <p className="text-text-muted text-[13px] mb-5">Update your approach counts</p>

              <div className="mb-5">
                <p className="text-[13px] font-medium mb-2">People approached</p>
                <div className="flex items-center justify-center gap-5">
                  <button
                    onClick={() => setEditApproaches(Math.max(0, editApproaches - 1))}
                    className="w-11 h-11 rounded-full bg-bg-card-hover border border-border flex items-center justify-center text-[20px] font-bold press"
                  >
                    −
                  </button>
                  <span className="font-display text-[40px] font-extrabold leading-none w-16 text-center">{editApproaches}</span>
                  <button
                    onClick={() => setEditApproaches(editApproaches + 1)}
                    className="w-11 h-11 rounded-full bg-bg-card-hover border border-border flex items-center justify-center text-[20px] font-bold press"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-[13px] font-medium mb-2">Went well</p>
                <div className="flex items-center justify-center gap-5">
                  <button
                    onClick={() => setEditSuccesses(Math.max(0, editSuccesses - 1))}
                    className="w-11 h-11 rounded-full bg-bg-card-hover border border-border flex items-center justify-center text-[20px] font-bold press"
                  >
                    −
                  </button>
                  <span className="font-display text-[40px] font-extrabold leading-none w-16 text-center">{editSuccesses}</span>
                  <button
                    onClick={() => setEditSuccesses(Math.min(editApproaches, editSuccesses + 1))}
                    className="w-11 h-11 rounded-full bg-bg-card-hover border border-border flex items-center justify-center text-[20px] font-bold press"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(false)}
                  className="flex-1 py-3.5 rounded-xl bg-bg-card-hover border border-border text-[15px] font-medium press"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={submitting}
                  className="flex-1 py-3.5 rounded-xl bg-[#1a1a1a] text-white text-[15px] font-medium press disabled:opacity-60"
                >
                  {submitting ? "..." : "Save"}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center mb-4 relative">
                <button
                  onClick={startEditing}
                  className="absolute top-0 right-0 p-2 press text-text-muted hover:text-text transition-colors"
                  title="Edit today's check-in"
                >
                  <Pencil size={16} strokeWidth={1.5} />
                </button>
                <div className={`w-18 h-18 rounded-full flex items-center justify-center mx-auto mb-3 ${flame.bgColor} ${justCheckedIn ? "streak-pop" : ""}`}
                  style={{ width: 72, height: 72 }}>
                  <Flame size={flame.size} strokeWidth={1.5} className={flame.color} />
                </div>
                <p className="font-display text-[40px] font-extrabold leading-none mb-0.5">{data.streak}</p>
                <p className="text-text-muted text-[14px]">day streak</p>
                {data.approachesCount > 0 && (
                  <p className="text-text-muted text-[12px] mt-1">
                    {data.approachesCount} approached · {data.successesCount} went well
                  </p>
                )}
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
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-semibold text-text-muted uppercase tracking-wide">Approach stats</h3>
            {!editingTotals && (
              <button onClick={startEditingTotals} className="p-1 press text-text-muted hover:text-text transition-colors">
                <Pencil size={14} strokeWidth={1.5} />
              </button>
            )}
          </div>

          {editingTotals ? (
            <div className="animate-fade-in">
              <div className="mb-4">
                <p className="text-[13px] font-medium mb-2 text-center">Total approaches</p>
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => setEditTotalApproaches(Math.max(0, editTotalApproaches - 1))}
                    className="w-10 h-10 rounded-full bg-bg-card-hover border border-border flex items-center justify-center text-[18px] font-bold press"
                  >−</button>
                  <span className="font-display text-[36px] font-extrabold leading-none w-14 text-center">{editTotalApproaches}</span>
                  <button
                    onClick={() => setEditTotalApproaches(editTotalApproaches + 1)}
                    className="w-10 h-10 rounded-full bg-bg-card-hover border border-border flex items-center justify-center text-[18px] font-bold press"
                  >+</button>
                </div>
              </div>
              <div className="mb-5">
                <p className="text-[13px] font-medium mb-2 text-center">Total succeeded</p>
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => setEditTotalSuccesses(Math.max(0, editTotalSuccesses - 1))}
                    className="w-10 h-10 rounded-full bg-bg-card-hover border border-border flex items-center justify-center text-[18px] font-bold press"
                  >−</button>
                  <span className="font-display text-[36px] font-extrabold leading-none w-14 text-center">{editTotalSuccesses}</span>
                  <button
                    onClick={() => setEditTotalSuccesses(Math.min(editTotalApproaches, editTotalSuccesses + 1))}
                    className="w-10 h-10 rounded-full bg-bg-card-hover border border-border flex items-center justify-center text-[18px] font-bold press"
                  >+</button>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingTotals(false)}
                  className="flex-1 py-3 rounded-xl bg-bg-card-hover border border-border text-[14px] font-medium press"
                >Cancel</button>
                <button
                  onClick={saveTotals}
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl bg-[#1a1a1a] text-white text-[14px] font-medium press disabled:opacity-60"
                >{submitting ? "..." : "Save"}</button>
              </div>
            </div>
          ) : (
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
          )}

          {/* Today's count — always visible inline counters */}
          {!editingTotals && (() => {
            const displayApproaches = todayApproaches ?? data.approachesCount;
            const displaySuccesses = todaySuccesses ?? data.successesCount;
            const hasChanges = todayApproaches !== null && (todayApproaches !== data.approachesCount || (todaySuccesses ?? 0) !== data.successesCount);
            return (
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-[12px] text-text-muted mb-1">Approached today</p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          const curr = todayApproaches ?? data.approachesCount;
                          const newVal = Math.max(0, curr - 1);
                          setTodayApproaches(newVal);
                          const currSucc = todaySuccesses ?? data.successesCount;
                          if (currSucc > newVal) setTodaySuccesses(newVal);
                        }}
                        className="w-8 h-8 rounded-full bg-bg-card-hover border border-border flex items-center justify-center text-[15px] font-bold press"
                      >−</button>
                      <span className="font-display text-[24px] font-extrabold w-8 text-center">{displayApproaches}</span>
                      <button
                        onClick={() => {
                          const curr = todayApproaches ?? data.approachesCount;
                          setTodayApproaches(curr + 1);
                        }}
                        className="w-8 h-8 rounded-full bg-bg-card-hover border border-border flex items-center justify-center text-[15px] font-bold press"
                      >+</button>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-[12px] text-text-muted mb-1 text-right">Went well</p>
                    <div className="flex items-center gap-3 justify-end">
                      <button
                        onClick={() => {
                          const curr = todaySuccesses ?? data.successesCount;
                          setTodaySuccesses(Math.max(0, curr - 1));
                          if (todayApproaches === null) setTodayApproaches(data.approachesCount);
                        }}
                        className="w-8 h-8 rounded-full bg-bg-card-hover border border-border flex items-center justify-center text-[15px] font-bold press"
                      >−</button>
                      <span className="font-display text-[24px] font-extrabold w-8 text-center">{displaySuccesses}</span>
                      <button
                        onClick={() => {
                          const currAppr = todayApproaches ?? data.approachesCount;
                          const curr = todaySuccesses ?? data.successesCount;
                          setTodaySuccesses(Math.min(currAppr, curr + 1));
                          if (todayApproaches === null) setTodayApproaches(data.approachesCount);
                        }}
                        className="w-8 h-8 rounded-full bg-bg-card-hover border border-border flex items-center justify-center text-[15px] font-bold press"
                      >+</button>
                    </div>
                  </div>
                </div>
                {hasChanges && (
                  <div className="flex gap-2 mt-3 animate-fade-in">
                    <button
                      onClick={() => { setTodayApproaches(null); setTodaySuccesses(null); }}
                      className="flex-1 py-2.5 rounded-xl bg-bg-card-hover border border-border text-[13px] font-medium press"
                    >Cancel</button>
                    <button
                      onClick={saveToday}
                      disabled={savingToday}
                      className="flex-1 py-2.5 rounded-xl bg-[#1a1a1a] text-white text-[13px] font-medium press disabled:opacity-60"
                    >{savingToday ? "..." : "Save"}</button>
                  </div>
                )}
              </div>
            );
          })()}
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
                <div key={entry.date}>
                  {editingDay === entry.date ? (
                    <div className="bg-bg-card border-2 border-[#1a1a1a] rounded-xl px-4 py-4 animate-fade-in">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[13px] font-semibold">{formatHistoryDate(entry.date)}</span>
                      </div>
                      <div className="mb-3">
                        <p className="text-[12px] text-text-muted mb-1.5 text-center">Approached</p>
                        <div className="flex items-center justify-center gap-4">
                          <button
                            onClick={() => setEditDayApproaches(Math.max(0, editDayApproaches - 1))}
                            className="w-9 h-9 rounded-full bg-bg-card-hover border border-border flex items-center justify-center text-[16px] font-bold press"
                          >−</button>
                          <span className="font-display text-[28px] font-extrabold leading-none w-10 text-center">{editDayApproaches}</span>
                          <button
                            onClick={() => setEditDayApproaches(editDayApproaches + 1)}
                            className="w-9 h-9 rounded-full bg-bg-card-hover border border-border flex items-center justify-center text-[16px] font-bold press"
                          >+</button>
                        </div>
                      </div>
                      <div className="mb-4">
                        <p className="text-[12px] text-text-muted mb-1.5 text-center">Went well</p>
                        <div className="flex items-center justify-center gap-4">
                          <button
                            onClick={() => setEditDaySuccesses(Math.max(0, editDaySuccesses - 1))}
                            className="w-9 h-9 rounded-full bg-bg-card-hover border border-border flex items-center justify-center text-[16px] font-bold press"
                          >−</button>
                          <span className="font-display text-[28px] font-extrabold leading-none w-10 text-center">{editDaySuccesses}</span>
                          <button
                            onClick={() => setEditDaySuccesses(Math.min(editDayApproaches, editDaySuccesses + 1))}
                            className="w-9 h-9 rounded-full bg-bg-card-hover border border-border flex items-center justify-center text-[16px] font-bold press"
                          >+</button>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingDay(null)}
                          className="flex-1 py-2.5 rounded-xl bg-bg-card-hover border border-border text-[13px] font-medium press"
                        >Cancel</button>
                        <button
                          onClick={saveDay}
                          disabled={submitting}
                          className="flex-1 py-2.5 rounded-xl bg-[#1a1a1a] text-white text-[13px] font-medium press disabled:opacity-60"
                        >{submitting ? "..." : "Save"}</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEditingDay(entry.date, entry.approaches, entry.successes)}
                      className="w-full bg-bg-card border border-border rounded-xl px-4 py-3.5 text-left press"
                    >
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                            entry.talked ? "bg-green-500 text-white" : "bg-orange-100 text-orange-600"
                          }`}>
                            {entry.talked ? <Check size={13} strokeWidth={2.5} /> : <X size={13} strokeWidth={2.5} />}
                          </div>
                          <span className="text-[14px] font-semibold">{formatHistoryDate(entry.date)}</span>
                        </div>
                        <Pencil size={13} strokeWidth={1.5} className="text-text-muted" />
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1 bg-bg-card-hover rounded-lg px-3 py-2 text-center">
                          <span className="font-display text-[20px] font-bold block">{entry.approaches}</span>
                          <span className="text-[11px] text-text-muted">approached</span>
                        </div>
                        <div className="flex-1 bg-bg-card-hover rounded-lg px-3 py-2 text-center">
                          <span className="font-display text-[20px] font-bold text-green-600 block">{entry.successes}</span>
                          <span className="text-[11px] text-text-muted">went well</span>
                        </div>
                        <div className="flex-1 bg-bg-card-hover rounded-lg px-3 py-2 text-center">
                          <span className="font-display text-[20px] font-bold text-red-400 block">{Math.max(0, entry.approaches - entry.successes)}</span>
                          <span className="text-[11px] text-text-muted">rejected</span>
                        </div>
                      </div>
                      {entry.note && <p className="text-[13px] text-text-muted leading-relaxed mt-2.5">{entry.note}</p>}
                    </button>
                  )}
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
