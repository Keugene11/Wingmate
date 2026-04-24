"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Sparkles } from "lucide-react";
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

export default function PlanView({ onPersonalize }: { onPersonalize?: () => void }) {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);

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
      <div className="bg-bg-card border border-border rounded-2xl shadow-card p-4 mb-3">
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

      {/* Personalize button */}
      <button
        onClick={onPersonalize}
        className="w-full flex items-center justify-center gap-2 bg-bg-card border border-border rounded-2xl shadow-card px-4 py-3.5 press"
      >
        <Sparkles size={16} strokeWidth={1.75} />
        <span className="text-[14px] font-semibold">
          {focus ? "Refine your focus" : "Personalize with Wingmate"}
        </span>
      </button>

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
