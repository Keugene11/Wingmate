"use client";

import { useState, useEffect } from "react";
import { Trophy, Crown, Medal, ChevronUp, ChevronDown, Shield } from "lucide-react";

type Player = {
  rank: number;
  username: string;
  weeklyXp: number;
  isYou: boolean;
};

type LeaderboardData = {
  optedIn: boolean;
  tier?: string;
  tierLabel?: string;
  weeklyXp?: number;
  userRank?: number;
  totalPlayers?: number;
  leaderboard?: Player[];
};

const TIER_CONFIG: Record<string, { color: string; bg: string; icon: typeof Trophy }> = {
  bronze: { color: "text-amber-700", bg: "bg-amber-100", icon: Shield },
  silver: { color: "text-gray-500", bg: "bg-gray-100", icon: Medal },
  gold: { color: "text-yellow-500", bg: "bg-yellow-50", icon: Crown },
  diamond: { color: "text-cyan-400", bg: "bg-cyan-50", icon: Trophy },
};

export default function Leaderboard() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [optingIn, setOptingIn] = useState(false);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch("/api/leaderboard");
      const d = await res.json();
      setData(d);
    } catch {
      setData({ optedIn: false });
    }
    setLoading(false);
  };

  useEffect(() => { fetchLeaderboard(); }, []);

  const handleOptIn = async () => {
    setOptingIn(true);
    await fetch("/api/leaderboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "opt-in" }),
    });
    await fetchLeaderboard();
    setOptingIn(false);
  };

  const handleOptOut = async () => {
    setOptingIn(true);
    await fetch("/api/leaderboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "opt-out" }),
    });
    await fetchLeaderboard();
    setOptingIn(false);
  };

  if (loading) {
    return (
      <div className="bg-bg-card border border-border rounded-2xl p-5 text-center">
        <div className="w-5 h-5 border-2 border-text-muted border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (!data?.optedIn) {
    return (
      <div className="bg-bg-card border border-border rounded-2xl p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-yellow-50 flex items-center justify-center mx-auto mb-3">
          <Trophy size={24} strokeWidth={1.5} className="text-yellow-500" />
        </div>
        <h3 className="font-display text-[18px] font-bold mb-1">Weekly Leagues</h3>
        <p className="text-text-muted text-[13px] leading-relaxed mb-5 max-w-[260px] mx-auto">
          Compete with others in your tier. Earn XP from check-ins to climb the ranks each week.
        </p>
        <button
          onClick={handleOptIn}
          disabled={optingIn}
          className="px-6 py-2.5 bg-[#1a1a1a] text-white rounded-xl font-medium text-[14px] press disabled:opacity-60"
        >
          {optingIn ? "Joining..." : "Join the league"}
        </button>
      </div>
    );
  }

  const tier = data.tier || "bronze";
  const config = TIER_CONFIG[tier] || TIER_CONFIG.bronze;
  const TierIcon = config.icon;
  const players = data.leaderboard || [];

  return (
    <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-border">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full ${config.bg} flex items-center justify-center`}>
              <TierIcon size={16} strokeWidth={1.5} className={config.color} />
            </div>
            <div>
              <h3 className="font-display text-[16px] font-bold">{data.tierLabel} League</h3>
              <p className="text-text-muted text-[11px]">
                Rank #{data.userRank} of {data.totalPlayers}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-display text-[18px] font-bold">{data.weeklyXp}</p>
            <p className="text-text-muted text-[10px]">Weekly XP</p>
          </div>
        </div>
      </div>

      {/* Promotion/demotion zones */}
      <div className="px-4 py-3 space-y-1.5 max-h-[300px] overflow-y-auto">
        {players.map((player, i) => {
          const isPromoZone = i < 3 && tier !== "diamond";
          const isDemoZone = i >= players.length - 3 && tier !== "bronze" && players.length > 5;

          return (
            <div
              key={i}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${
                player.isYou
                  ? "bg-[#1a1a1a] text-white"
                  : isPromoZone
                  ? "bg-green-50"
                  : isDemoZone
                  ? "bg-red-50/50"
                  : ""
              }`}
            >
              <span className={`w-6 text-center font-bold text-[14px] shrink-0 ${
                player.rank === 1 ? "text-yellow-500" :
                player.rank === 2 ? "text-gray-400" :
                player.rank === 3 ? "text-amber-700" :
                player.isYou ? "text-white/70" : "text-text-muted"
              }`}>
                {player.rank}
              </span>
              <span className={`flex-1 font-medium text-[14px] truncate ${
                player.isYou ? "text-white" : ""
              }`}>
                {player.username}
                {player.isYou && <span className="text-[11px] ml-1 opacity-60">(you)</span>}
              </span>
              {isPromoZone && !player.isYou && (
                <ChevronUp size={14} className="text-green-500 shrink-0" />
              )}
              {isDemoZone && !player.isYou && (
                <ChevronDown size={14} className="text-red-400 shrink-0" />
              )}
              <span className={`font-medium text-[13px] shrink-0 ${
                player.isYou ? "text-white/80" : "text-text-muted"
              }`}>
                {player.weeklyXp} XP
              </span>
            </div>
          );
        })}

        {players.length === 0 && (
          <p className="text-center text-text-muted text-[13px] py-4">
            No players yet. Check in to start earning XP!
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-3 text-[11px] text-text-muted">
          <span className="flex items-center gap-1">
            <ChevronUp size={12} className="text-green-500" /> Promotion
          </span>
          <span className="flex items-center gap-1">
            <ChevronDown size={12} className="text-red-400" /> Demotion
          </span>
        </div>
        <button
          onClick={handleOptOut}
          disabled={optingIn}
          className="text-[11px] text-text-muted underline press"
        >
          Leave league
        </button>
      </div>
    </div>
  );
}
