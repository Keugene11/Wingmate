"use client";

import { useState, useRef } from "react";
import { ChevronRight, X } from "lucide-react";
import { LEVELS, MAX_LEVEL } from "@/lib/levels";

interface LevelBadgeProps {
  level: number;
  xp: number;
  xpToNextLevel: number;
  xpForCurrentLevel?: number;
  levelName: string;
}

export default function LevelBadge({ level, xp, xpToNextLevel, xpForCurrentLevel = 0, levelName }: LevelBadgeProps) {
  const [showModal, setShowModal] = useState(false);
  const isMaxLevel = level >= MAX_LEVEL;

  // Progress within current level band
  const levelRange = xpToNextLevel - xpForCurrentLevel;
  const levelProgress = xp - xpForCurrentLevel;
  const progress = isMaxLevel ? 100 : levelRange > 0 ? (levelProgress / levelRange) * 100 : 0;

  const sheetRef = useRef<HTMLDivElement>(null);

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
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={(e) => {
            if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
              setShowModal(false);
            }
          }}
        >
          <div className="absolute inset-0 bg-black/40 animate-fade-in" />
          <div
            ref={sheetRef}
            className="relative w-full max-w-md bg-bg border-t border-border rounded-t-2xl animate-slide-up flex flex-col overflow-hidden"
            style={{ maxHeight: "90vh" }}
            onTouchMove={(e) => e.stopPropagation()}
          >
            {/* Fixed header */}
            <div className="px-5 pt-5 pb-3 shrink-0">
              <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between">
                <h2 className="font-display text-[20px] font-bold tracking-tight">How levels work</h2>
                <button type="button" onClick={() => setShowModal(false)} className="press p-1">
                  <X size={20} className="text-text-muted" />
                </button>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="relative flex-1 min-h-0 overflow-hidden">
            <div
              className="overflow-y-auto overscroll-contain px-5 pb-10 h-full"
              style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
            >
              {/* Explainer */}
              <p className="text-[14px] text-text-muted leading-relaxed mb-5">
                Every approach you log earns you <span className="text-text font-semibold">1 XP</span>.
              </p>

              {/* Level list */}
              <div className="space-y-2">
                {LEVELS.map((lvl, i) => {
                  const isCurrent = lvl.level === level;
                  const isCompleted = lvl.level < level;
                  const nextLvl = LEVELS[i + 1];
                  const lvlRange = nextLvl ? nextLvl.totalRequired - lvl.totalRequired : 0;
                  const lvlProgress = isCurrent ? xp - lvl.totalRequired : 0;
                  const lvlPercent = lvlRange > 0 ? (lvlProgress / lvlRange) * 100 : 0;

                  return (
                    <div
                      key={lvl.level}
                      className={`rounded-xl border px-4 py-3.5 ${
                        isCurrent
                          ? "bg-[#1a1a1a] text-white border-[#1a1a1a]"
                          : isCompleted
                            ? "bg-bg-card border-border"
                            : "bg-bg-card border-border opacity-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-display text-[14px] font-bold shrink-0 ${
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
                          <p className={`text-[15px] font-bold leading-tight ${isCurrent ? "text-white" : ""}`}>
                            {lvl.name}
                          </p>
                          <p className={`text-[12px] mt-0.5 ${isCurrent ? "text-white/60" : "text-text-muted"}`}>
                            {lvl.level === 1
                              ? "Where everyone starts"
                              : `${lvl.totalRequired} approaches to unlock`
                            }
                          </p>
                        </div>
                        {isCurrent && !isMaxLevel && (
                          <span className="text-[11px] font-semibold bg-white/20 px-2.5 py-1 rounded-full whitespace-nowrap">
                            {xp}/{nextLvl!.totalRequired} XP
                          </span>
                        )}
                        {isCurrent && isMaxLevel && (
                          <span className="text-[11px] font-semibold text-green-400 bg-green-400/20 px-2.5 py-1 rounded-full">
                            MAX
                          </span>
                        )}
                        {isCompleted && (
                          <span className="text-[11px] font-medium text-green-600">Done</span>
                        )}
                      </div>

                      {/* Progress bar for current level */}
                      {isCurrent && !isMaxLevel && nextLvl && (
                        <div className="mt-3">
                          <div className="h-1.5 bg-white/15 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-white rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, lvlPercent)}%` }}
                            />
                          </div>
                          <p className="text-[11px] text-white/40 mt-1.5">
                            {nextLvl.totalRequired - xp} more approach{nextLvl.totalRequired - xp !== 1 ? "es" : ""} to level {level + 1}
                          </p>
                        </div>
                      )}
                      {isCurrent && isMaxLevel && (
                        <p className="text-[11px] text-white/40 mt-2">
                          You made it. Keep approaching to stay sharp.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Summary */}
              <div className="mt-5 bg-bg-card border border-border rounded-xl px-4 py-3.5">
                <div className="text-[13px] text-text-muted">
                  <p>1 approach = 1 XP</p>
                </div>
              </div>
            </div>
            {/* Bottom fade to hint at scrollable content */}
            <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-bg to-transparent pointer-events-none" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
