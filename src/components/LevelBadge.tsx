"use client";

import { useState } from "react";
import { ChevronRight, X, Zap } from "lucide-react";
import { LEVELS, MAX_LEVEL } from "@/lib/levels";

interface LevelBadgeProps {
  level: number;
  xp: number;
  xpToNextLevel: number;
  levelName: string;
}

export default function LevelBadge({ level, xp, xpToNextLevel, levelName }: LevelBadgeProps) {
  const [showModal, setShowModal] = useState(false);
  const isMaxLevel = level >= MAX_LEVEL;
  const progress = isMaxLevel ? 100 : xpToNextLevel > 0 ? (xp / xpToNextLevel) * 100 : 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="w-full text-left bg-bg-card border border-border rounded-2xl shadow-card px-5 py-4 press"
      >
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center font-display text-[14px] font-bold shrink-0">
              {level}
            </div>
            <div>
              <p className="text-[15px] font-bold leading-tight">{levelName}</p>
              <p className="text-[11px] text-text-muted">Level {level}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {!isMaxLevel && (
              <span className="text-[12px] text-text-muted font-medium">{xp}/{xpToNextLevel} XP</span>
            )}
            {isMaxLevel && (
              <span className="text-[11px] font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">MAX</span>
            )}
            <ChevronRight size={14} className="text-text-muted" />
          </div>
        </div>
        <div className="h-2 bg-bg-card-hover rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isMaxLevel ? "bg-green-500" : "bg-[#1a1a1a]"}`}
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowModal(false)}>
          <div className="absolute inset-0 bg-black/40 animate-fade-in" />
          <div
            className="relative w-full max-w-md bg-bg border-t border-border rounded-t-2xl px-5 pt-5 pb-8 animate-slide-up"
            style={{ maxHeight: "85vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-[20px] font-bold tracking-tight">Levels</h2>
              <button type="button" onClick={() => setShowModal(false)} className="press p-1">
                <X size={20} className="text-text-muted" />
              </button>
            </div>

            {/* How XP works */}
            <div className="bg-bg-card border border-border rounded-xl px-4 py-3.5 mb-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center">
                  <Zap size={14} />
                </div>
                <p className="text-[14px] font-semibold">How to earn XP</p>
              </div>
              <p className="text-[13px] text-text-muted leading-relaxed">
                You earn <span className="text-text font-semibold">1 XP for every approach</span> you log in your daily check-in. The more girls you talk to, the faster you level up.
              </p>
            </div>

            {/* Level list */}
            <div className="space-y-2.5">
              {LEVELS.map((lvl, i) => {
                const isCurrent = lvl.level === level;
                const isCompleted = lvl.level < level;
                const nextLvl = LEVELS[i + 1];
                const xpNeeded = nextLvl ? nextLvl.xpRequired : null;

                return (
                  <div
                    key={lvl.level}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                      isCurrent
                        ? "bg-[#1a1a1a] text-white border-[#1a1a1a]"
                        : isCompleted
                          ? "bg-bg-card border-border opacity-60"
                          : "bg-bg-card border-border"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-display text-[13px] font-bold shrink-0 ${
                        isCurrent
                          ? "bg-white text-[#1a1a1a]"
                          : isCompleted
                            ? "bg-green-100 text-green-600"
                            : "bg-bg-card-hover text-text-muted"
                      }`}
                    >
                      {isCompleted ? "\u2713" : lvl.level}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[14px] font-semibold leading-tight ${isCurrent ? "text-white" : ""}`}>
                        {lvl.name}
                      </p>
                      <p className={`text-[11px] mt-0.5 ${isCurrent ? "text-white/60" : "text-text-muted"}`}>
                        {xpNeeded !== null
                          ? `${xpNeeded} XP to next level`
                          : "Final level"
                        }
                      </p>
                    </div>
                    {isCurrent && !isMaxLevel && (
                      <span className="text-[11px] font-semibold bg-white/20 px-2.5 py-1 rounded-full whitespace-nowrap">
                        {xp}/{xpToNextLevel} XP
                      </span>
                    )}
                    {isCurrent && isMaxLevel && (
                      <span className="text-[11px] font-semibold text-green-400 bg-green-400/20 px-2.5 py-1 rounded-full">
                        MAX
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* How leveling works */}
            <div className="mt-5 px-1">
              <p className="text-[12px] font-semibold text-text-muted uppercase tracking-wide mb-2">How leveling works</p>
              <ul className="space-y-1.5 text-[13px] text-text-muted leading-relaxed">
                <li>Each approach you log = 1 XP</li>
                <li>XP resets to 0 when you level up</li>
                <li>Higher levels need more XP to advance</li>
                <li>Level 6 is the final level — keep approaching to stay sharp</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
