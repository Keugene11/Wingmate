"use client";

import { MAX_LEVEL } from "@/lib/levels";

interface LevelBadgeProps {
  level: number;
  xp: number;
  xpToNextLevel: number;
  levelName: string;
}

export default function LevelBadge({ level, xp, xpToNextLevel, levelName }: LevelBadgeProps) {
  const isMaxLevel = level >= MAX_LEVEL;
  const progress = isMaxLevel ? 100 : xpToNextLevel > 0 ? (xp / xpToNextLevel) * 100 : 0;

  return (
    <div className="bg-bg-card border border-border rounded-2xl shadow-card px-5 py-4">
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
        {!isMaxLevel && (
          <span className="text-[12px] text-text-muted font-medium">{xp}/{xpToNextLevel} XP</span>
        )}
        {isMaxLevel && (
          <span className="text-[11px] font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">MAX</span>
        )}
      </div>
      <div className="h-2 bg-bg-card-hover rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isMaxLevel ? "bg-green-500" : "bg-[#1a1a1a]"}`}
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>
    </div>
  );
}
