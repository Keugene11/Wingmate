"use client";

import { useState, useEffect } from "react";
import { Flame, Trophy, Calendar, Shield, Eye, Target, ThumbsUp, UserX } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import UpgradeModal from "@/components/UpgradeModal";

interface CheckinData {
  checkedInToday: boolean;
  talked: boolean | null;
  opportunitiesCount: number;
  approachesCount: number;
  successesCount: number;
  streak: number;
  bestStreak: number;
  totalCheckins: number;
  totalTalked: number;
  approachRate: number;
  totalOpportunities: number;
  totalApproaches: number;
  totalSuccesses: number;
  totalFailures: number;
  totalDidntApproach: number;
  successRate: number;
  approachConversionRate: number;
  last7: { date: string; talked: boolean | null; approaches: number }[];
  history: { date: string; talked: boolean; opportunities: number; approaches: number; successes: number }[];
  streakFreezes: number;
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export default function DailyCheckin({ greeting, onTalkAboutIt, onCheckedIn, isLoggedIn = true, isPro = true }: { greeting?: string; onTalkAboutIt: (talked: boolean) => void; onCheckedIn?: () => void; isLoggedIn?: boolean; isPro?: boolean }) {
  const [showUpgrade, setShowUpgrade] = useState(false);

  const guardPro = (fn: () => void) => {
    if (!isPro) { setShowUpgrade(true); return; }
    fn();
  };
  const [data, setData] = useState<CheckinData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [justCheckedIn, setJustCheckedIn] = useState(false);

  const [flowOpportunities, setFlowOpportunities] = useState(0);
  const [flowApproaches, setFlowApproaches] = useState(0);
  const [flowSuccesses, setFlowSuccesses] = useState(0);

  const [saveError, setSaveError] = useState<string | null>(null);


  const getLocalDate = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  };

  const refreshData = async () => {
    try {
      const res = await fetch(`/api/checkin?today=${getLocalDate()}`);
      if (!res.ok) {
        console.error("GET /api/checkin failed:", res.status, await res.text());
        return;
      }
      const json = await res.json();
      if (json.error) {
        console.error("GET /api/checkin error:", json.error);
        return;
      }
      setData(json);
    } catch (e) {
      console.error("refreshData failed:", e);
    }
  };

  useEffect(() => { refreshData(); }, []);

  // Sync flow counters with saved data when loaded
  useEffect(() => {
    if (data?.checkedInToday) {
      setFlowOpportunities(data.opportunitiesCount);
      setFlowApproaches(data.approachesCount);
      setFlowSuccesses(data.successesCount);
    }
  }, [data?.checkedInToday, data?.opportunitiesCount, data?.approachesCount, data?.successesCount]);

  const submitCheckin = async (talked: boolean, opportunities: number, approaches: number, successes: number) => {
    setSubmitting(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ talked, opportunitiesCount: opportunities, approachesCount: approaches, successesCount: successes, clientDate: getLocalDate() }),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error("POST /api/checkin failed:", res.status, text);
        setSaveError(`Save failed (${res.status})`);
        setSubmitting(false);
        return;
      }
      await refreshData();
      setJustCheckedIn(true);
      onCheckedIn?.();
    } catch (e) {
      console.error("submitCheckin error:", e);
      setSaveError("Network error — check your connection");
    }
    setSubmitting(false);
  };



  if (!data) {
    if (!isLoggedIn) {
      const triggerSignIn = () => { const s = createClient(); s.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback` } }); };
      const todayDate = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
      const emptyLast7 = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return { date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`, talked: null as boolean | null, approaches: 0 };
      });
      return (
        <div className="space-y-4">
          <div className="mb-2 animate-slide-up">
            {greeting && <h1 className="text-[28px] font-bold tracking-tight leading-[1.2] mb-1">{greeting}</h1>}
            <p className="text-text-muted text-[13px] font-medium uppercase tracking-wide mb-1">{todayDate}</p>
            <p className="text-text-muted text-[14px] leading-relaxed">
              Track how many girls you saw, approached, and how many went well. Build the habit — check in every day.
            </p>
          </div>

          {/* Check-in card */}
          <div className="rounded-2xl px-5 py-6 bg-[#1a1a1a] text-white">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-display text-[18px] font-bold">Enter today&apos;s stats</h2>
                <p className="text-white/50 text-[13px]">Start your streak today</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-white/10">
                <Flame size={20} strokeWidth={1.5} className="text-orange-400" />
              </div>
            </div>

            <div className="space-y-4 mb-5">
              <div>
                <p className="text-[13px] text-white/50 mb-2">Girls you saw</p>
                <div className="flex items-center gap-4">
                  <button onClick={triggerSignIn} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-[18px] font-bold press">−</button>
                  <span className="font-display text-[36px] font-extrabold leading-none w-12 text-center">0</span>
                  <button onClick={triggerSignIn} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-[18px] font-bold press">+</button>
                </div>
              </div>
              <div>
                <p className="text-[13px] text-white/50 mb-2">Girls you approached</p>
                <div className="flex items-center gap-4">
                  <button onClick={triggerSignIn} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-[18px] font-bold press">−</button>
                  <span className="font-display text-[36px] font-extrabold leading-none w-12 text-center">0</span>
                  <button onClick={triggerSignIn} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-[18px] font-bold press">+</button>
                </div>
              </div>
              <div>
                <p className="text-[13px] text-white/50 mb-2">Went well</p>
                <div className="flex items-center gap-4">
                  <button onClick={triggerSignIn} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-[18px] font-bold press">−</button>
                  <span className="font-display text-[36px] font-extrabold leading-none w-12 text-center">0</span>
                  <button onClick={triggerSignIn} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-[18px] font-bold press">+</button>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={triggerSignIn}
                className="flex-1 py-3.5 rounded-xl bg-white/10 text-white/70 text-[14px] font-medium press">
                No approaches today
              </button>
              <button onClick={triggerSignIn}
                className="flex-1 py-3.5 rounded-xl bg-white text-[#1a1a1a] text-[14px] font-semibold press">
                Save
              </button>
            </div>
          </div>

          {/* All-time stats (zeroed, disabled) */}
          <div className="bg-bg-card border border-border rounded-2xl px-5 py-4 opacity-50">
            <h3 className="text-[13px] font-semibold text-text-muted uppercase tracking-wide mb-3">All-time stats</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-bg-card-hover rounded-xl px-2 py-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Eye size={14} strokeWidth={1.5} className="text-purple-500" />
                  <span className="font-display text-[22px] font-bold">0</span>
                </div>
                <p className="text-[11px] text-text-muted">Opportunities</p>
              </div>
              <div className="bg-bg-card-hover rounded-xl px-2 py-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Target size={14} strokeWidth={1.5} className="text-blue-500" />
                  <span className="font-display text-[22px] font-bold">0</span>
                </div>
                <p className="text-[11px] text-text-muted">Approaches</p>
              </div>
              <div className="bg-bg-card-hover rounded-xl px-2 py-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <ThumbsUp size={14} strokeWidth={1.5} className="text-green-500" />
                  <span className="font-display text-[22px] font-bold">0</span>
                </div>
                <p className="text-[11px] text-text-muted">Went well</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="bg-bg-card-hover rounded-xl px-2 py-2.5 text-center">
                <span className="font-display text-[18px] font-bold text-blue-500">0%</span>
                <p className="text-[10px] text-text-muted">Approach rate</p>
              </div>
              <div className="bg-bg-card-hover rounded-xl px-2 py-2.5 text-center">
                <span className="font-display text-[18px] font-bold text-green-500">0%</span>
                <p className="text-[10px] text-text-muted">Success rate</p>
              </div>
            </div>
          </div>

          {/* 7-day dots (empty) */}
          <div className="bg-bg-card border border-border rounded-2xl px-5 py-5 opacity-50">
            <div className="flex justify-between px-1">
              {emptyLast7.map((day, i) => {
                const dayOfWeek = new Date(day.date + "T00:00:00").getDay();
                const isToday = i === 6;
                return (
                  <div key={day.date} className="flex flex-col items-center gap-1.5">
                    <span className={`text-[10px] font-medium ${isToday ? "text-text" : "text-text-muted"}`}>
                      {DAY_LABELS[dayOfWeek]}
                    </span>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[14px] font-bold ${
                      isToday ? "border-2 border-dashed border-text-muted/30" : "bg-bg-card-hover"
                    }`} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick stats (zeroed) */}
          <div className="grid grid-cols-3 gap-3 opacity-50">
            <div className="bg-bg-card border border-border rounded-xl px-3 py-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Trophy size={13} strokeWidth={1.5} className="text-orange-500" />
                <span className="font-display text-[20px] font-bold">0</span>
              </div>
              <p className="text-[11px] text-text-muted">Best streak</p>
            </div>
            <div className="bg-bg-card border border-border rounded-xl px-3 py-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Calendar size={13} strokeWidth={1.5} className="text-text-muted" />
                <span className="font-display text-[20px] font-bold">0</span>
              </div>
              <p className="text-[11px] text-text-muted">Total days</p>
            </div>
            <div className="bg-bg-card border border-border rounded-xl px-3 py-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <UserX size={13} strokeWidth={1.5} className="text-text-muted" />
                <span className="font-display text-[20px] font-bold">0</span>
              </div>
              <p className="text-[11px] text-text-muted">Days skipped</p>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <div className="bg-bg-card border border-border rounded-2xl h-48 animate-pulse" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="bg-bg-card border border-border rounded-xl h-20 animate-pulse" />)}
        </div>
      </div>
    );
  }


  const todayDate = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const approachStatsSection = (
    <div className="bg-bg-card border border-border rounded-2xl px-5 py-4">
      <h3 className="text-[13px] font-semibold text-text-muted uppercase tracking-wide mb-3">All-time stats</h3>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-bg-card-hover rounded-xl px-2 py-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Eye size={14} strokeWidth={1.5} className="text-purple-500" />
            <span className="font-display text-[22px] font-bold">{data.totalOpportunities}</span>
          </div>
          <p className="text-[11px] text-text-muted">Opportunities</p>
        </div>
        <div className="bg-bg-card-hover rounded-xl px-2 py-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Target size={14} strokeWidth={1.5} className="text-blue-500" />
            <span className="font-display text-[22px] font-bold">{data.totalApproaches}</span>
          </div>
          <p className="text-[11px] text-text-muted">Approaches</p>
        </div>
        <div className="bg-bg-card-hover rounded-xl px-2 py-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <ThumbsUp size={14} strokeWidth={1.5} className="text-green-500" />
            <span className="font-display text-[22px] font-bold">{data.totalSuccesses}</span>
          </div>
          <p className="text-[11px] text-text-muted">Went well</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <div className="bg-bg-card-hover rounded-xl px-2 py-2.5 text-center">
          <span className="font-display text-[18px] font-bold text-blue-500">{data.approachConversionRate}%</span>
          <p className="text-[10px] text-text-muted">Approach rate</p>
        </div>
        <div className="bg-bg-card-hover rounded-xl px-2 py-2.5 text-center">
          <span className="font-display text-[18px] font-bold text-green-500">{data.successRate}%</span>
          <p className="text-[10px] text-text-muted">Success rate</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Page header — different message depending on state */}
      <div className="mb-2 animate-slide-up">
        {greeting && <h1 className="text-[28px] font-bold tracking-tight leading-[1.2] mb-1">{greeting}</h1>}
        <p className="text-text-muted text-[13px] font-medium uppercase tracking-wide mb-1">{todayDate}</p>
        {!data.checkedInToday ? (
          <p className="text-text-muted text-[14px] leading-relaxed">
            Track how many girls you saw, approached, and how many went well. Build the habit — check in every day.
          </p>
        ) : (
          <p className="text-text-muted text-[14px] leading-relaxed">
            {data.streak > 0 ? `${data.streak}-day streak. ` : ""}Keep updating your numbers throughout the day.
          </p>
        )}
      </div>

      {/* Error banner */}
      {saveError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-center animate-fade-in">
          <p className="text-[14px] font-medium text-red-700">{saveError}</p>
          <button onClick={() => setSaveError(null)} className="text-[12px] text-red-500 mt-1 press">Dismiss</button>
        </div>
      )}

      {/* Main check-in card — always the same black card style */}
      <div className="rounded-2xl px-5 py-6 bg-[#1a1a1a] text-white">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-display text-[18px] font-bold">
                  {data.checkedInToday ? "Today\u2019s stats" : "Enter today\u2019s stats"}
                </h2>
                <p className="text-white/50 text-[13px]">
                  {data.streak > 0 ? `${data.streak}-day streak — don\u2019t break it` : "Start your streak today"}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-white/10">
                <Flame size={20} strokeWidth={1.5} className="text-orange-400" />
              </div>
            </div>

            <div className="space-y-4 mb-5">
              <div>
                <p className="text-[13px] text-white/50 mb-2">Girls you saw</p>
                <div className="flex items-center gap-4">
                  <button onClick={() => guardPro(() => setFlowOpportunities(Math.max(0, flowOpportunities - 1)))}
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-[18px] font-bold press">−</button>
                  <span className="font-display text-[36px] font-extrabold leading-none w-12 text-center">{flowOpportunities}</span>
                  <button onClick={() => guardPro(() => setFlowOpportunities(flowOpportunities + 1))}
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-[18px] font-bold press">+</button>
                </div>
              </div>
              <div>
                <p className="text-[13px] text-white/50 mb-2">Girls you approached</p>
                <div className="flex items-center gap-4">
                  <button onClick={() => guardPro(() => setFlowApproaches(Math.max(0, flowApproaches - 1)))}
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-[18px] font-bold press">−</button>
                  <span className="font-display text-[36px] font-extrabold leading-none w-12 text-center">{flowApproaches}</span>
                  <button onClick={() => guardPro(() => setFlowApproaches(Math.min(flowOpportunities, flowApproaches + 1)))}
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-[18px] font-bold press">+</button>
                </div>
              </div>
              <div>
                <p className="text-[13px] text-white/50 mb-2">Went well</p>
                <div className="flex items-center gap-4">
                  <button onClick={() => guardPro(() => setFlowSuccesses(Math.max(0, flowSuccesses - 1)))}
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-[18px] font-bold press">−</button>
                  <span className="font-display text-[36px] font-extrabold leading-none w-12 text-center">{flowSuccesses}</span>
                  <button onClick={() => guardPro(() => setFlowSuccesses(Math.min(flowApproaches, flowSuccesses + 1)))}
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-[18px] font-bold press">+</button>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => guardPro(() => submitCheckin(false, 0, 0, 0))} disabled={submitting}
                className="flex-1 py-3.5 rounded-xl bg-white/10 text-white/70 text-[14px] font-medium press">
                No approaches today
              </button>
              <button onClick={() => guardPro(() => submitCheckin(true, flowOpportunities, flowApproaches, flowSuccesses))}
                disabled={submitting}
                className="flex-1 py-3.5 rounded-xl bg-white text-[#1a1a1a] text-[14px] font-semibold press disabled:opacity-60">
                {submitting ? "..." : "Save"}
              </button>
            </div>
      </div>

      {/* All-time approach stats */}
      {data.checkedInToday && approachStatsSection}

      {/* 7-day history */}
      <div className="bg-bg-card border border-border rounded-2xl px-5 py-5">

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
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[14px] font-bold transition-all ${
                  day.talked === true ? "bg-green-500 text-white"
                    : day.talked === false ? "bg-orange-100 text-orange-600"
                    : isToday ? "border-2 border-dashed border-text-muted/30"
                    : "bg-bg-card-hover"
                } ${justCheckedIn && isToday ? "streak-pop" : ""}`}>
                  {day.talked !== null ? day.approaches : null}
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


      </div>

      {/* Show approach stats after main card when NOT checked in */}
      {!data.checkedInToday && approachStatsSection}

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

      {/* Streak at risk */}
      {data.streak > 0 && !data.checkedInToday && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-center">
          <p className="text-[14px] font-medium text-orange-700">
            Your {data.streak}-day streak is at risk! Log today&apos;s approaches to keep it alive.
          </p>
        </div>
      )}

      <UpgradeModal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        title="Unlock the tracker"
        description="Upgrade to Pro to log check-ins, build streaks, and track your approach stats."
      />
    </div>
  );
}
