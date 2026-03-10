"use client";

import { useState, useEffect } from "react";
import { Flame, Check, X, MessageCircle, Trophy, TrendingUp, Calendar, Shield, Eye, Target, ThumbsUp, UserX, Pencil } from "lucide-react";
import { getFlameLevel } from "@/lib/gamification";

interface CheckinData {
  checkedInToday: boolean;
  talked: boolean | null;
  note: string | null;
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
  history: { date: string; talked: boolean; note: string | null; opportunities: number; approaches: number; successes: number }[];
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

export default function DailyCheckin({ greeting, onTalkAboutIt, onCheckedIn }: { greeting?: string; onTalkAboutIt: (talked: boolean) => void; onCheckedIn?: () => void }) {
  const [data, setData] = useState<CheckinData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [justCheckedIn, setJustCheckedIn] = useState(false);
  const [noteInput, setNoteInput] = useState("");
  const [showNoteField, setShowNoteField] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);

  const [flowOpportunities, setFlowOpportunities] = useState(0);
  const [flowApproaches, setFlowApproaches] = useState(0);
  const [flowSuccesses, setFlowSuccesses] = useState(0);

  // Edit today's check-in (pencil button)
  const [editing, setEditing] = useState(false);
  const [editOpportunities, setEditOpportunities] = useState(0);
  const [editApproaches, setEditApproaches] = useState(0);
  const [editSuccesses, setEditSuccesses] = useState(0);

  // Today's inline counters
  const [todayOpportunities, setTodayOpportunities] = useState<number | null>(null);
  const [todayApproaches, setTodayApproaches] = useState<number | null>(null);
  const [todaySuccesses, setTodaySuccesses] = useState<number | null>(null);
  const [savingToday, setSavingToday] = useState(false);

  // Edit past day
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [editDayOpportunities, setEditDayOpportunities] = useState(0);
  const [editDayApproaches, setEditDayApproaches] = useState(0);
  const [editDaySuccesses, setEditDaySuccesses] = useState(0);

  useEffect(() => {
    fetch("/api/checkin")
      .then((res) => res.json())
      .then(setData)
      .catch(() => {});
  }, []);

  const submitCheckin = async (talked: boolean, opportunities: number, approaches: number, successes: number) => {
    setSubmitting(true);

    const res = await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ talked, opportunitiesCount: opportunities, approachesCount: approaches, successesCount: successes }),
    });
    const result = await res.json();

    setData((prev) =>
      prev ? {
        ...prev,
        checkedInToday: true,
        talked,
        opportunitiesCount: opportunities,
        approachesCount: approaches,
        successesCount: successes,
        streak: result.streak,
        bestStreak: result.bestStreak,
        totalCheckins: result.totalCheckins,
        totalTalked: result.totalTalked,
        approachRate: result.approachRate,
        totalOpportunities: result.totalOpportunities,
        totalApproaches: result.totalApproaches,
        totalSuccesses: result.totalSuccesses,
        totalFailures: result.totalFailures,
        totalDidntApproach: result.totalDidntApproach,
        successRate: result.successRate,
        approachConversionRate: result.approachConversionRate,
        last7: prev.last7.map((d, i) => i === prev.last7.length - 1 ? { ...d, talked, approaches } : d),
      } : prev
    );
    setJustCheckedIn(true);
    setShowNoteField(true);
    setSubmitting(false);
    onCheckedIn?.();
  };

  const startEditing = () => {
    setEditOpportunities(data?.opportunitiesCount ?? 0);
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
        opportunitiesCount: editOpportunities,
        approachesCount: editApproaches,
        successesCount: editSuccesses,
        note: data?.note,
      }),
    });
    const result = await res.json();
    setData((prev) =>
      prev ? {
        ...prev,
        talked,
        opportunitiesCount: editOpportunities,
        approachesCount: editApproaches,
        successesCount: editSuccesses,
        totalOpportunities: result.totalOpportunities,
        totalApproaches: result.totalApproaches,
        totalSuccesses: result.totalSuccesses,
        totalFailures: result.totalFailures,
        totalDidntApproach: result.totalDidntApproach,
        successRate: result.successRate,
        approachConversionRate: result.approachConversionRate,
        totalTalked: result.totalTalked,
        approachRate: result.approachRate,
        last7: prev.last7.map((d, i) => i === prev.last7.length - 1 ? { ...d, talked, approaches: editApproaches } : d),
      } : prev
    );
    setEditing(false);
    setSubmitting(false);
  };

  const saveToday = async () => {
    if (todayOpportunities === null && todayApproaches === null && todaySuccesses === null) return;
    const today = new Date().toISOString().split("T")[0];
    const opportunities = todayOpportunities ?? data?.opportunitiesCount ?? 0;
    const approaches = todayApproaches ?? data?.approachesCount ?? 0;
    const successes = todaySuccesses ?? data?.successesCount ?? 0;
    setSavingToday(true);
    try {
      const res = await fetch("/api/checkin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today, opportunities, approaches, successes }),
      });
      const result = await res.json();
      setData((prev) =>
        prev ? {
          ...prev,
          opportunitiesCount: opportunities,
          approachesCount: approaches,
          successesCount: successes,
          totalOpportunities: result.totalOpportunities,
          totalApproaches: result.totalApproaches,
          totalSuccesses: result.totalSuccesses,
          totalFailures: result.totalFailures,
          totalDidntApproach: result.totalDidntApproach,
          successRate: result.successRate,
          approachConversionRate: result.approachConversionRate,
          history: result.history || prev.history,
        } : prev
      );
      setTodayOpportunities(null);
      setTodayApproaches(null);
      setTodaySuccesses(null);
    } catch {}
    setSavingToday(false);
  };

  const startEditingDay = (entry: { date: string; opportunities: number; approaches: number; successes: number }) => {
    setEditDayOpportunities(entry.opportunities);
    setEditDayApproaches(entry.approaches);
    setEditDaySuccesses(entry.successes);
    setEditingDay(entry.date);
  };

  const saveDay = async () => {
    if (!editingDay) return;
    setSubmitting(true);
    const res = await fetch("/api/checkin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: editingDay,
        opportunities: editDayOpportunities,
        approaches: editDayApproaches,
        successes: editDaySuccesses,
      }),
    });
    const result = await res.json();
    setData((prev) =>
      prev ? {
        ...prev,
        totalOpportunities: result.totalOpportunities,
        totalApproaches: result.totalApproaches,
        totalSuccesses: result.totalSuccesses,
        totalFailures: result.totalFailures,
        totalDidntApproach: result.totalDidntApproach,
        successRate: result.successRate,
        approachConversionRate: result.approachConversionRate,
        history: result.history || prev.history.map((h) =>
          h.date === editingDay
            ? { ...h, opportunities: editDayOpportunities, approaches: editDayApproaches, successes: editDaySuccesses, talked: editDayApproaches > 0 }
            : h
        ),
      } : prev
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
        opportunitiesCount: data?.opportunitiesCount,
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



  const todayDate = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const todayCountersSection = (() => {
    const dispOpp = todayOpportunities ?? data.opportunitiesCount;
    const dispAppr = todayApproaches ?? data.approachesCount;
    const dispSucc = todaySuccesses ?? data.successesCount;
    const hasChanges = todayOpportunities !== null || todayApproaches !== null || todaySuccesses !== null;
    const isDirty = hasChanges && (dispOpp !== data.opportunitiesCount || dispAppr !== data.approachesCount || dispSucc !== data.successesCount);

    const initIfNeeded = () => {
      if (todayOpportunities === null) setTodayOpportunities(data.opportunitiesCount);
      if (todayApproaches === null) setTodayApproaches(data.approachesCount);
      if (todaySuccesses === null) setTodaySuccesses(data.successesCount);
    };

    return (
      <div className="grid grid-cols-3 gap-3">
        {/* Seen */}
        <div className="bg-purple-50 border border-purple-200 rounded-2xl px-3 py-4 flex flex-col items-center">
          <span className="text-[11px] font-bold text-purple-500 uppercase tracking-wider mb-3">Seen</span>
          <button onClick={() => { initIfNeeded(); setTodayOpportunities(dispOpp + 1); }}
            className="w-full h-11 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 text-[22px] font-bold press active:bg-purple-200 mb-2">+</button>
          <span className="font-display text-[40px] font-extrabold leading-none text-purple-600 my-1">{dispOpp}</span>
          <button onClick={() => { initIfNeeded(); setTodayOpportunities(Math.max(0, dispOpp - 1)); if (dispAppr > dispOpp - 1) setTodayApproaches(Math.max(0, dispOpp - 1)); }}
            className="w-full h-11 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 text-[22px] font-bold press active:bg-purple-200 mt-2">−</button>
        </div>
        {/* Approached */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl px-3 py-4 flex flex-col items-center">
          <span className="text-[11px] font-bold text-blue-500 uppercase tracking-wider mb-3">Approached</span>
          <button onClick={() => { initIfNeeded(); setTodayApproaches(Math.min(dispOpp, dispAppr + 1)); }}
            className="w-full h-11 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 text-[22px] font-bold press active:bg-blue-200 mb-2">+</button>
          <span className="font-display text-[40px] font-extrabold leading-none text-blue-600 my-1">{dispAppr}</span>
          <button onClick={() => { initIfNeeded(); setTodayApproaches(Math.max(0, dispAppr - 1)); if (dispSucc > dispAppr - 1) setTodaySuccesses(Math.max(0, dispAppr - 1)); }}
            className="w-full h-11 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 text-[22px] font-bold press active:bg-blue-200 mt-2">−</button>
        </div>
        {/* Went well */}
        <div className="bg-green-50 border border-green-200 rounded-2xl px-3 py-4 flex flex-col items-center">
          <span className="text-[11px] font-bold text-green-500 uppercase tracking-wider mb-3">Went well</span>
          <button onClick={() => { initIfNeeded(); setTodaySuccesses(Math.min(dispAppr, dispSucc + 1)); }}
            className="w-full h-11 rounded-xl bg-green-100 flex items-center justify-center text-green-600 text-[22px] font-bold press active:bg-green-200 mb-2">+</button>
          <span className="font-display text-[40px] font-extrabold leading-none text-green-600 my-1">{dispSucc}</span>
          <button onClick={() => { initIfNeeded(); setTodaySuccesses(Math.max(0, dispSucc - 1)); }}
            className="w-full h-11 rounded-xl bg-green-100 flex items-center justify-center text-green-600 text-[22px] font-bold press active:bg-green-200 mt-2">−</button>
        </div>
        {isDirty && (
          <div className="col-span-3 flex gap-2 animate-fade-in">
            <button onClick={() => { setTodayOpportunities(null); setTodayApproaches(null); setTodaySuccesses(null); }}
              className="flex-1 py-3 rounded-xl bg-bg-card border border-border text-[14px] font-medium press">Cancel</button>
            <button onClick={saveToday} disabled={savingToday}
              className="flex-1 py-3 rounded-xl bg-[#1a1a1a] text-white text-[14px] font-semibold press disabled:opacity-60">
              {savingToday ? "..." : "Save"}</button>
          </div>
        )}
      </div>
    );
  })();

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
        {greeting && <h1 className="font-display text-[28px] font-bold tracking-tight leading-[1.2] mb-1">{greeting}</h1>}
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

      {/* Today's counters — always at the very top when checked in */}
      {data.checkedInToday && todayCountersSection}

      {/* All-time approach stats */}
      {data.checkedInToday && approachStatsSection}

      {/* Main check-in card */}
      {!data.checkedInToday && (
      <div className={`rounded-2xl px-5 py-6 bg-[#1a1a1a] text-white`}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-display text-[18px] font-bold">Enter today&apos;s stats</h2>
                <p className="text-white/50 text-[13px]">
                  {data.streak > 0 ? `${data.streak}-day streak — don't break it` : "Start your streak today"}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-white/10`}>
                <Flame size={20} strokeWidth={1.5} className="text-orange-400" />
              </div>
            </div>

            <div className="space-y-4 mb-5">
              <div>
                <p className="text-[13px] text-white/50 mb-2">Girls you saw</p>
                <div className="flex items-center gap-4">
                  <button onClick={() => setFlowOpportunities(Math.max(0, flowOpportunities - 1))}
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-[18px] font-bold press">−</button>
                  <span className="font-display text-[36px] font-extrabold leading-none w-12 text-center">{flowOpportunities}</span>
                  <button onClick={() => setFlowOpportunities(flowOpportunities + 1)}
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-[18px] font-bold press">+</button>
                </div>
              </div>
              <div>
                <p className="text-[13px] text-white/50 mb-2">Girls you approached</p>
                <div className="flex items-center gap-4">
                  <button onClick={() => setFlowApproaches(Math.max(0, flowApproaches - 1))}
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-[18px] font-bold press">−</button>
                  <span className="font-display text-[36px] font-extrabold leading-none w-12 text-center">{flowApproaches}</span>
                  <button onClick={() => { setFlowApproaches(Math.min(flowOpportunities, flowApproaches + 1)); }}
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-[18px] font-bold press">+</button>
                </div>
              </div>
              <div>
                <p className="text-[13px] text-white/50 mb-2">Went well</p>
                <div className="flex items-center gap-4">
                  <button onClick={() => setFlowSuccesses(Math.max(0, flowSuccesses - 1))}
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-[18px] font-bold press">−</button>
                  <span className="font-display text-[36px] font-extrabold leading-none w-12 text-center">{flowSuccesses}</span>
                  <button onClick={() => setFlowSuccesses(Math.min(flowApproaches, flowSuccesses + 1))}
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-[18px] font-bold press">+</button>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => submitCheckin(false, 0, 0, 0)} disabled={submitting}
                className="flex-1 py-3.5 rounded-xl bg-white/10 text-white/70 text-[14px] font-medium press">
                No approaches today
              </button>
              <button onClick={() => submitCheckin(true, flowOpportunities, flowApproaches, flowSuccesses)}
                disabled={submitting}
                className="flex-1 py-3.5 rounded-xl bg-white text-[#1a1a1a] text-[14px] font-semibold press disabled:opacity-60">
                {submitting ? "..." : "Save"}
              </button>
            </div>
      </div>
      )}

      {/* 7-day history + talk button */}
      {data.checkedInToday && (
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

        {/* Note field */}
        {showNoteField && !noteSaved && (
          <div className="mt-4 animate-fade-in">
            <textarea value={noteInput} onChange={(e) => setNoteInput(e.target.value.slice(0, 280))}
              placeholder={data.talked ? "How did it go? What did you say?" : "What held you back today?"} rows={2}
              className="w-full bg-bg-card-hover border border-border rounded-xl px-4 py-3 text-[14px] leading-relaxed placeholder:text-text-muted/50 outline-none focus:border-text-muted transition-colors resize-none" />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[11px] text-text-muted">{noteInput.length}/280</span>
              <div className="flex gap-2">
                <button onClick={() => setShowNoteField(false)} className="text-[13px] text-text-muted press px-3 py-1.5">Skip</button>
                <button onClick={saveNote} disabled={!noteInput.trim()}
                  className={`text-[13px] font-medium press px-4 py-1.5 rounded-full transition-opacity ${
                    noteInput.trim() ? "bg-[#1a1a1a] text-white" : "bg-border text-text-muted opacity-50"}`}>Save</button>
              </div>
            </div>
          </div>
        )}

        {/* Talk about it */}
        {data.checkedInToday && !showNoteField && (
          <button onClick={() => onTalkAboutIt(data.talked!)}
            className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-bg-card-hover text-[14px] font-medium press">
            <MessageCircle size={16} strokeWidth={1.5} />
            {data.talked ? "Tell me how it went" : "Let's talk about what's holding you back"}
          </button>
        )}
      </div>
      )}

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

      {/* History */}
      {data.history.length > 0 && (
        <div>
          <h3 className="text-[13px] font-semibold text-text-muted uppercase tracking-wide mb-3 px-1">Recent activity</h3>
          <div className="space-y-2">
            {data.history.map((entry) => (
              <div key={entry.date}>
                {editingDay === entry.date ? (
                  <div className="bg-bg-card border-2 border-[#1a1a1a] rounded-xl px-4 py-4 animate-fade-in">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[13px] font-semibold">{formatHistoryDate(entry.date)}</span>
                    </div>
                    {[
                      { label: "Opportunities", value: editDayOpportunities, set: setEditDayOpportunities, min: 0 },
                      { label: "Approached", value: editDayApproaches, set: setEditDayApproaches, min: 0, max: editDayOpportunities },
                      { label: "Went well", value: editDaySuccesses, set: setEditDaySuccesses, min: 0, max: editDayApproaches },
                    ].map(({ label, value, set, min, max }) => (
                      <div key={label} className="mb-3">
                        <p className="text-[12px] text-text-muted mb-1.5 text-center">{label}</p>
                        <div className="flex items-center justify-center gap-4">
                          <button onClick={() => set(Math.max(min, value - 1))}
                            className="w-9 h-9 rounded-full bg-bg-card-hover border border-border flex items-center justify-center text-[16px] font-bold press">−</button>
                          <span className="font-display text-[28px] font-extrabold leading-none w-10 text-center">{value}</span>
                          <button onClick={() => set(max !== undefined ? Math.min(max, value + 1) : value + 1)}
                            className="w-9 h-9 rounded-full bg-bg-card-hover border border-border flex items-center justify-center text-[16px] font-bold press">+</button>
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-2 mt-1">
                      <button onClick={() => setEditingDay(null)}
                        className="flex-1 py-2.5 rounded-xl bg-bg-card-hover border border-border text-[13px] font-medium press">Cancel</button>
                      <button onClick={saveDay} disabled={submitting}
                        className="flex-1 py-2.5 rounded-xl bg-[#1a1a1a] text-white text-[13px] font-medium press disabled:opacity-60">
                        {submitting ? "..." : "Save"}</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => startEditingDay(entry)}
                    className="w-full bg-bg-card border border-border rounded-xl px-4 py-3.5 text-left press">
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
                      <div className="flex-1 bg-bg-card-hover rounded-lg px-2 py-2 text-center">
                        <span className="font-display text-[20px] font-bold text-purple-600 block">{entry.opportunities}</span>
                        <span className="text-[10px] text-text-muted">seen</span>
                      </div>
                      <div className="flex-1 bg-bg-card-hover rounded-lg px-2 py-2 text-center">
                        <span className="font-display text-[20px] font-bold block">{entry.approaches}</span>
                        <span className="text-[10px] text-text-muted">approached</span>
                      </div>
                      <div className="flex-1 bg-bg-card-hover rounded-lg px-2 py-2 text-center">
                        <span className="font-display text-[20px] font-bold text-green-600 block">{entry.successes}</span>
                        <span className="text-[10px] text-text-muted">went well</span>
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
            Your {data.streak}-day streak is at risk! Log today&apos;s approaches to keep it alive.
          </p>
        </div>
      )}
    </div>
  );
}
