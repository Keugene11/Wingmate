"use client";

import { useState, useEffect } from "react";
import { Flame, Check, X, MessageCircle, Trophy, TrendingUp, Calendar, Shield, Zap } from "lucide-react";
import { getLevelInfo, getFlameLevel, BADGES, getBadgeById, type BadgeDef } from "@/lib/gamification";

interface CheckinData {
  checkedInToday: boolean;
  talked: boolean | null;
  note: string | null;
  streak: number;
  bestStreak: number;
  totalCheckins: number;
  totalTalked: number;
  approachRate: number;
  last7: { date: string; talked: boolean | null }[];
  history: { date: string; talked: boolean; note: string | null }[];
  xp: number;
  streakFreezes: number;
  badges: string[];
}

const MOTIVATION = [
  "Every conversation is a rep. You're getting stronger.",
  "Confidence isn't born — it's built. One day at a time.",
  "The hardest part is showing up. You're already here.",
  "Yesterday's courage is today's comfort zone.",
  "You miss 100% of the conversations you don't start.",
  "Small talk today, deep connection tomorrow.",
  "Fear shrinks every time you face it.",
  "The person you'll be in a month is watching.",
];

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
  const [newBadgeQueue, setNewBadgeQueue] = useState<BadgeDef[]>([]);
  const [showBadgeModal, setShowBadgeModal] = useState<BadgeDef | null>(null);
  const [xpGain, setXpGain] = useState(0);
  const [showBadges, setShowBadges] = useState(false);

  useEffect(() => {
    fetch("/api/checkin")
      .then((res) => res.json())
      .then(setData)
      .catch(() => {});
  }, []);

  // Show badge modals one by one
  useEffect(() => {
    if (newBadgeQueue.length > 0 && !showBadgeModal) {
      const [next, ...rest] = newBadgeQueue;
      setShowBadgeModal(next);
      setNewBadgeQueue(rest);
    }
  }, [newBadgeQueue, showBadgeModal]);

  const handleCheckin = async (talked: boolean) => {
    if (submitting) return;
    setSubmitting(true);

    const res = await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ talked }),
    });
    const result = await res.json();

    setData((prev) =>
      prev
        ? {
            ...prev,
            checkedInToday: true,
            talked,
            streak: result.streak,
            bestStreak: result.bestStreak,
            totalCheckins: result.totalCheckins,
            totalTalked: result.totalTalked,
            approachRate: result.approachRate,
            xp: result.xp,
            badges: [...prev.badges, ...(result.newBadges || [])],
            last7: prev.last7.map((d, i) =>
              i === prev.last7.length - 1 ? { ...d, talked } : d
            ),
          }
        : prev
    );
    setJustCheckedIn(true);
    setShowNoteField(true);
    setXpGain(result.xpEarned || 0);
    setSubmitting(false);
    onCheckedIn?.();

    // Queue new badge celebrations
    if (result.newBadges?.length) {
      const badges = result.newBadges.map((id: string) => getBadgeById(id)).filter(Boolean) as BadgeDef[];
      setNewBadgeQueue(badges);
    }
  };

  const saveNote = async () => {
    if (!noteInput.trim()) return;
    await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ talked: data?.talked, note: noteInput.trim() }),
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

  const level = getLevelInfo(data.xp);
  const flame = getFlameLevel(data.streak);

  return (
    <>
      {/* Badge celebration modal */}
      {showBadgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in" onClick={() => setShowBadgeModal(null)}>
          <div className="bg-bg rounded-2xl px-8 py-8 mx-6 text-center max-w-sm animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="text-[56px] mb-3">{showBadgeModal.icon}</div>
            <h3 className="font-display text-[20px] font-bold mb-1">Badge unlocked!</h3>
            <p className="font-display text-[17px] font-semibold mb-1">{showBadgeModal.name}</p>
            <p className="text-text-muted text-[14px] mb-1">{showBadgeModal.description}</p>
            <p className="text-orange-500 text-[13px] font-medium mb-5">+50 XP</p>
            <button
              onClick={() => setShowBadgeModal(null)}
              className="w-full py-3 bg-[#1a1a1a] text-white rounded-xl font-medium text-[15px] press"
            >
              Nice!
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* XP / Level bar */}
        <div className="bg-bg-card border border-border rounded-2xl px-5 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap size={14} strokeWidth={2} className="text-orange-500" />
              <span className="text-[13px] font-semibold">Lvl {level.current.level}</span>
              <span className="text-[12px] text-text-muted">{level.current.title}</span>
            </div>
            <span className="text-[12px] text-text-muted font-medium">
              {data.xp} XP {xpGain > 0 && justCheckedIn && (
                <span className="text-green-500 animate-fade-in">+{xpGain}</span>
              )}
            </span>
          </div>
          <div className="w-full h-2 bg-bg-card-hover rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-700"
              style={{ width: `${level.progress * 100}%` }}
            />
          </div>
          {level.next && (
            <p className="text-[11px] text-text-muted mt-1.5">
              {level.next.xpRequired - data.xp} XP to Level {level.next.level} — {level.next.title}
            </p>
          )}
        </div>

        {/* Main check-in card */}
        <div className={`bg-bg-card border border-border rounded-2xl px-5 py-5 ${justCheckedIn ? "animate-fade-in" : ""}`}>
          {!data.checkedInToday ? (
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

        {/* Stats row */}
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
              <TrendingUp size={13} strokeWidth={1.5} className="text-green-500" />
              <span className="font-display text-[20px] font-bold">{data.approachRate}%</span>
            </div>
            <p className="text-[11px] text-text-muted">Approach rate</p>
          </div>
        </div>

        {/* Badges section */}
        <div className="bg-bg-card border border-border rounded-2xl px-5 py-4">
          <button
            onClick={() => setShowBadges(!showBadges)}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold uppercase tracking-wide text-text-muted">Badges</span>
              <span className="text-[12px] text-text-muted">{data.badges.length}/{BADGES.length}</span>
            </div>
            <span className="text-[12px] text-text-muted">{showBadges ? "Hide" : "Show all"}</span>
          </button>

          {/* Recent badges (always show last 3 earned) */}
          {!showBadges && data.badges.length > 0 && (
            <div className="flex gap-2 mt-3">
              {data.badges.slice(-3).map((id) => {
                const badge = getBadgeById(id);
                if (!badge) return null;
                return (
                  <div key={id} className="flex items-center gap-1.5 bg-bg-card-hover rounded-full px-3 py-1.5">
                    <span className="text-[14px]">{badge.icon}</span>
                    <span className="text-[12px] font-medium">{badge.name}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Full badge grid */}
          {showBadges && (
            <div className="grid grid-cols-4 gap-3 mt-4">
              {BADGES.map((badge) => {
                const earned = data.badges.includes(badge.id);
                return (
                  <div key={badge.id} className={`flex flex-col items-center text-center ${earned ? "" : "opacity-30"}`}>
                    <span className={`text-[28px] mb-1 ${earned ? "" : "grayscale"}`}>{badge.icon}</span>
                    <span className="text-[10px] font-medium leading-tight">{badge.name}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Motivation */}
        <div className="bg-bg-card border border-border rounded-xl px-4 py-3">
          <p className="text-[14px] leading-relaxed text-center italic text-text-muted">
            &ldquo;{MOTIVATION[Math.floor(data.totalCheckins % MOTIVATION.length)]}&rdquo;
          </p>
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
    </>
  );
}
