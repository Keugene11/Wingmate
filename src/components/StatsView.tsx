"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, Eye, Target, ThumbsUp, TrendingUp, Flame, Calendar } from "lucide-react";

interface CheckinEntry {
  date: string;
  talked: boolean;
  opportunities: number;
  approaches: number;
  successes: number;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_HEADERS = ["S", "M", "T", "W", "T", "F", "S"];

type ViewMode = "month" | "all-time";

export default function StatsView() {
  const [checkins, setCheckins] = useState<CheckinEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [mode, setMode] = useState<ViewMode>("month");

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((d) => {
        setCheckins(d.checkins || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const checkinMap = useMemo(() => {
    const map: Record<string, CheckinEntry> = {};
    checkins.forEach((c) => { map[c.date] = c; });
    return map;
  }, [checkins]);

  const calendarDays = useMemo(() => {
    const { year, month } = viewMonth;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const days: { date: string | null; day: number; entry: CheckinEntry | null; isToday: boolean; isFuture: boolean }[] = [];

    for (let i = 0; i < firstDay; i++) {
      days.push({ date: null, day: 0, entry: null, isToday: false, isFuture: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        date: dateStr,
        day: d,
        entry: checkinMap[dateStr] || null,
        isToday: dateStr === today,
        isFuture: dateStr > today,
      });
    }

    return days;
  }, [viewMonth, checkinMap]);

  const computeStats = (entries: CheckinEntry[]) => {
    const opportunities = entries.reduce((s, c) => s + c.opportunities, 0);
    const approaches = entries.reduce((s, c) => s + c.approaches, 0);
    const successes = entries.reduce((s, c) => s + c.successes, 0);
    const daysActive = entries.length;
    const daysApproached = entries.filter((c) => c.talked).length;
    const approachRate = opportunities > 0 ? Math.round((approaches / opportunities) * 100) : 0;
    const successRate = approaches > 0 ? Math.round((successes / approaches) * 100) : 0;
    return { opportunities, approaches, successes, daysActive, daysApproached, approachRate, successRate };
  };

  const monthStats = useMemo(() => {
    const { year, month } = viewMonth;
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    return computeStats(checkins.filter((c) => c.date.startsWith(prefix)));
  }, [viewMonth, checkins]);

  const allTimeStats = useMemo(() => {
    const base = computeStats(checkins);

    // Streak
    let streak = 0;
    if (checkins.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const first = new Date(checkins[0].date + "T00:00:00");
      const diffFirst = Math.floor((today.getTime() - first.getTime()) / 86400000);
      if (diffFirst <= 1) {
        streak = 1;
        for (let i = 1; i < checkins.length; i++) {
          const prev = new Date(checkins[i - 1].date + "T00:00:00");
          const curr = new Date(checkins[i].date + "T00:00:00");
          if (Math.floor((prev.getTime() - curr.getTime()) / 86400000) === 1) streak++;
          else break;
        }
      }
    }

    let bestStreak = 0;
    if (checkins.length > 0) {
      const sorted = [...checkins].reverse();
      let current = 1;
      bestStreak = 1;
      for (let i = 1; i < sorted.length; i++) {
        const prev = new Date(sorted[i - 1].date + "T00:00:00");
        const curr = new Date(sorted[i].date + "T00:00:00");
        if (Math.floor((curr.getTime() - prev.getTime()) / 86400000) === 1) {
          current++;
          if (current > bestStreak) bestStreak = current;
        } else current = 1;
      }
    }

    // Monthly breakdown
    const monthlyMap: Record<string, { opportunities: number; approaches: number; successes: number }> = {};
    checkins.forEach((c) => {
      const key = c.date.slice(0, 7);
      if (!monthlyMap[key]) monthlyMap[key] = { opportunities: 0, approaches: 0, successes: 0 };
      monthlyMap[key].opportunities += c.opportunities;
      monthlyMap[key].approaches += c.approaches;
      monthlyMap[key].successes += c.successes;
    });
    const monthlyBreakdown = Object.entries(monthlyMap)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([month, data]) => ({
        month,
        label: MONTH_NAMES[parseInt(month.split("-")[1]) - 1] + " " + month.split("-")[0],
        ...data,
      }));

    return { ...base, streak, bestStreak: Math.max(bestStreak, streak), monthlyBreakdown };
  }, [checkins]);

  const navigateMonth = (dir: -1 | 1) => {
    setViewMonth((prev) => {
      let m = prev.month + dir;
      let y = prev.year;
      if (m < 0) { m = 11; y--; }
      if (m > 11) { m = 0; y++; }
      return { year: y, month: m };
    });
  };

  const isCurrentMonth = viewMonth.year === new Date().getFullYear() && viewMonth.month === new Date().getMonth();

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-bg-card border border-border rounded-2xl h-80 animate-pulse" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="bg-bg-card border border-border rounded-xl h-20 animate-pulse" />)}
        </div>
      </div>
    );
  }

  const stats = mode === "month" ? monthStats : allTimeStats;

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex gap-1 bg-bg-card border border-border rounded-full p-1">
        {(["month", "all-time"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 px-4 py-2 rounded-full text-[13px] font-medium transition-colors ${
              mode === m ? "bg-[#1a1a1a] text-white" : "text-text-muted"
            }`}
          >
            {m === "month" ? "Monthly" : "All Time"}
          </button>
        ))}
      </div>

      {/* Month navigation */}
      {mode === "month" && (
        <div className="flex items-center justify-between px-1">
          <button onClick={() => navigateMonth(-1)} className="p-2 press rounded-full hover:bg-bg-card-hover transition-colors">
            <ChevronLeft size={20} strokeWidth={2} />
          </button>
          <h2 className="font-display text-[18px] font-bold">
            {MONTH_NAMES[viewMonth.month]} {viewMonth.year}
          </h2>
          <button
            onClick={() => navigateMonth(1)}
            disabled={isCurrentMonth}
            className="p-2 press rounded-full hover:bg-bg-card-hover transition-colors disabled:opacity-20"
          >
            <ChevronRight size={20} strokeWidth={2} />
          </button>
        </div>
      )}

      {/* Calendar grid */}
      {mode === "month" && (
        <div className="bg-bg-card border border-border rounded-2xl px-3 py-4">
          <div className="grid grid-cols-7 mb-2">
            {DAY_HEADERS.map((d, i) => (
              <div key={i} className="text-center text-[11px] font-medium text-text-muted py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1">
            {calendarDays.map((cell, i) => {
              if (!cell.date) return <div key={`empty-${i}`} className="aspect-square" />;
              const hasEntry = !!cell.entry;
              const approached = cell.entry?.talked === true;
              const didntApproach = cell.entry?.talked === false;

              const approachCount = cell.entry?.approaches ?? 0;

              return (
                <div key={cell.date} className="flex flex-col items-center justify-center aspect-square relative">
                  <span className="text-[9px] text-text-muted leading-none mb-0.5">{cell.day}</span>
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-[15px] font-bold transition-all ${
                      cell.isToday
                        ? approached
                          ? "bg-green-500 text-white ring-2 ring-green-300"
                          : didntApproach
                          ? "bg-orange-100 text-orange-600 ring-2 ring-orange-300"
                          : "ring-2 ring-text-muted/30 text-text-muted"
                        : approached
                        ? "bg-green-500 text-white"
                        : didntApproach
                        ? "bg-orange-100 text-orange-600"
                        : cell.isFuture
                        ? "text-text-muted/20"
                        : "text-text-muted/40"
                    }`}
                  >
                    {hasEntry ? approachCount : ""}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-border">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-[11px] text-text-muted">Approached</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-orange-100 border border-orange-300" />
              <span className="text-[11px] text-text-muted">Checked in</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-bg-card-hover border border-border" />
              <span className="text-[11px] text-text-muted">No entry</span>
            </div>
          </div>
        </div>
      )}

      {/* Main 3 stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-bg-card border border-border rounded-xl px-2 py-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Eye size={14} strokeWidth={1.5} className="text-purple-500" />
            <span className="font-display text-[22px] font-bold">{stats.opportunities}</span>
          </div>
          <p className="text-[11px] text-text-muted">Opportunities</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl px-2 py-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Target size={14} strokeWidth={1.5} className="text-blue-500" />
            <span className="font-display text-[22px] font-bold">{stats.approaches}</span>
          </div>
          <p className="text-[11px] text-text-muted">Approaches</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl px-2 py-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <ThumbsUp size={14} strokeWidth={1.5} className="text-green-500" />
            <span className="font-display text-[22px] font-bold">{stats.successes}</span>
          </div>
          <p className="text-[11px] text-text-muted">Went well</p>
        </div>
      </div>

      {/* Rates + activity */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-bg-card border border-border rounded-xl px-3 py-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <TrendingUp size={14} strokeWidth={1.5} className="text-blue-500" />
            <span className="font-display text-[22px] font-bold">{stats.approachRate}%</span>
          </div>
          <p className="text-[11px] text-text-muted">Approach rate</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl px-3 py-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <TrendingUp size={14} strokeWidth={1.5} className="text-green-500" />
            <span className="font-display text-[22px] font-bold">{stats.successRate}%</span>
          </div>
          <p className="text-[11px] text-text-muted">Success rate</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl px-3 py-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Calendar size={14} strokeWidth={1.5} className="text-text-muted" />
            <span className="font-display text-[22px] font-bold">{stats.daysActive}</span>
          </div>
          <p className="text-[11px] text-text-muted">Days checked in</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl px-3 py-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Flame size={14} strokeWidth={1.5} className="text-orange-500" />
            <span className="font-display text-[22px] font-bold">{stats.daysApproached}</span>
          </div>
          <p className="text-[11px] text-text-muted">Days approached</p>
        </div>
      </div>

      {/* All-time extras */}
      {mode === "all-time" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-bg-card border border-border rounded-xl px-3 py-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Flame size={14} strokeWidth={1.5} className="text-orange-500" />
                <span className="font-display text-[22px] font-bold">{allTimeStats.streak}</span>
              </div>
              <p className="text-[11px] text-text-muted">Current streak</p>
            </div>
            <div className="bg-bg-card border border-border rounded-xl px-3 py-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Flame size={14} strokeWidth={1.5} className="text-red-500" />
                <span className="font-display text-[22px] font-bold">{allTimeStats.bestStreak}</span>
              </div>
              <p className="text-[11px] text-text-muted">Best streak</p>
            </div>
          </div>

          {allTimeStats.monthlyBreakdown.length > 0 && (
            <div>
              <h3 className="text-[13px] font-semibold text-text-muted uppercase tracking-wide mb-3 px-1">
                Monthly breakdown
              </h3>
              <div className="space-y-2">
                {allTimeStats.monthlyBreakdown.map((m) => (
                  <div key={m.month} className="bg-bg-card border border-border rounded-xl px-4 py-3.5">
                    <p className="text-[14px] font-semibold mb-2.5">{m.label}</p>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-bg-card-hover rounded-lg px-2 py-2 text-center">
                        <span className="font-display text-[18px] font-bold text-purple-600 block">{m.opportunities}</span>
                        <span className="text-[10px] text-text-muted">seen</span>
                      </div>
                      <div className="flex-1 bg-bg-card-hover rounded-lg px-2 py-2 text-center">
                        <span className="font-display text-[18px] font-bold text-blue-600 block">{m.approaches}</span>
                        <span className="text-[10px] text-text-muted">approached</span>
                      </div>
                      <div className="flex-1 bg-bg-card-hover rounded-lg px-2 py-2 text-center">
                        <span className="font-display text-[18px] font-bold text-green-600 block">{m.successes}</span>
                        <span className="text-[10px] text-text-muted">went well</span>
                      </div>
                      <div className="flex-1 bg-bg-card-hover rounded-lg px-2 py-2 text-center">
                        <span className="font-display text-[18px] font-bold text-orange-500 block">
                          {m.approaches > 0 ? Math.round((m.successes / m.approaches) * 100) : 0}%
                        </span>
                        <span className="text-[10px] text-text-muted">rate</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
