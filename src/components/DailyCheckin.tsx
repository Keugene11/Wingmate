"use client";

import { useState, useEffect } from "react";
import { Flame, Check, X, MessageCircle } from "lucide-react";

interface CheckinData {
  checkedInToday: boolean;
  talked: boolean | null;
  streak: number;
  last7: { date: string; talked: boolean | null }[];
}

const MILESTONES: Record<number, string> = {
  3: "3 days! You're building momentum.",
  7: "A whole week! You're on fire.",
  14: "Two weeks strong. This is who you are now.",
  30: "30 days. Absolute legend.",
};

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export default function DailyCheckin({ onTalkAboutIt }: { onTalkAboutIt: (talked: boolean) => void }) {
  const [data, setData] = useState<CheckinData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [justCheckedIn, setJustCheckedIn] = useState(false);
  const [showMilestone, setShowMilestone] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/checkin")
      .then((res) => res.json())
      .then(setData)
      .catch(() => {});
  }, []);

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
            last7: prev.last7.map((d, i) =>
              i === prev.last7.length - 1 ? { ...d, talked } : d
            ),
          }
        : prev
    );
    setJustCheckedIn(true);
    setSubmitting(false);

    // Check for milestone
    const milestone = MILESTONES[result.streak];
    if (milestone) {
      setShowMilestone(milestone);
      setTimeout(() => setShowMilestone(null), 4000);
    }
  };

  if (!data) return null;

  // Already checked in
  if (data.checkedInToday) {
    return (
      <div className={`bg-bg-card border border-border rounded-2xl px-5 py-4 ${justCheckedIn ? "animate-fade-in" : ""}`}>
        {/* Streak header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Flame size={18} strokeWidth={1.5} className="text-orange-500" />
            <span className="font-display text-[15px] font-bold">
              {data.streak} day{data.streak !== 1 ? "s" : ""}
            </span>
          </div>
          <span className="text-[12px] text-text-muted">
            {data.talked ? "Talked today" : "Checked in today"}
          </span>
        </div>

        {/* 7-day dots */}
        <div className="flex justify-between">
          {data.last7.map((day, i) => {
            const dayOfWeek = new Date(day.date + "T00:00:00").getDay();
            return (
              <div key={day.date} className="flex flex-col items-center gap-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium transition-all ${
                    day.talked === true
                      ? "bg-green-500 text-white"
                      : day.talked === false
                      ? "bg-orange-100 text-orange-600"
                      : i === data.last7.length - 1
                      ? "border-2 border-dashed border-text-muted/30"
                      : "bg-bg-card-hover"
                  } ${justCheckedIn && i === data.last7.length - 1 ? "streak-pop" : ""}`}
                >
                  {day.talked === true ? (
                    <Check size={13} strokeWidth={2.5} />
                  ) : day.talked === false ? (
                    <X size={13} strokeWidth={2.5} />
                  ) : null}
                </div>
                <span className="text-[10px] text-text-muted">{DAY_LABELS[dayOfWeek]}</span>
              </div>
            );
          })}
        </div>

        {/* Milestone toast */}
        {showMilestone && (
          <div className="mt-3 text-center text-[13px] font-medium text-orange-600 animate-fade-in">
            {showMilestone}
          </div>
        )}

        {/* Talk about it CTA */}
        {justCheckedIn && (
          <button
            onClick={() => onTalkAboutIt(data.talked!)}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-bg-card-hover text-[13px] font-medium press animate-fade-in"
          >
            <MessageCircle size={14} strokeWidth={1.5} />
            {data.talked ? "Tell me how it went" : "Let's talk about it"}
          </button>
        )}
      </div>
    );
  }

  // Not checked in yet
  return (
    <div className="bg-bg-card border border-border rounded-2xl px-5 py-4 animate-fade-in">
      <div className="flex items-center gap-2 mb-1">
        <Flame size={18} strokeWidth={1.5} className="text-orange-500" />
        <span className="font-display text-[15px] font-bold">Daily check-in</span>
        {data.streak > 0 && (
          <span className="text-[12px] text-orange-500 font-medium ml-auto">
            {data.streak} day streak
          </span>
        )}
      </div>
      <p className="text-text-muted text-[14px] mb-4">
        Did you talk to someone new today?
      </p>

      <div className="flex gap-2">
        <button
          onClick={() => handleCheckin(true)}
          disabled={submitting}
          className="flex-1 py-3 rounded-xl bg-[#1a1a1a] text-white text-[14px] font-medium press"
        >
          Yes, I did
        </button>
        <button
          onClick={() => handleCheckin(false)}
          disabled={submitting}
          className="flex-1 py-3 rounded-xl bg-bg-card-hover border border-border text-[14px] font-medium press"
        >
          Not yet
        </button>
      </div>

      {/* 7-day dots */}
      <div className="flex justify-between mt-4">
        {data.last7.map((day, i) => {
          const dayOfWeek = new Date(day.date + "T00:00:00").getDay();
          return (
            <div key={day.date} className="flex flex-col items-center gap-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium ${
                  day.talked === true
                    ? "bg-green-500 text-white"
                    : day.talked === false
                    ? "bg-orange-100 text-orange-600"
                    : i === data.last7.length - 1
                    ? "border-2 border-dashed border-text-muted/30"
                    : "bg-bg-card-hover"
                }`}
              >
                {day.talked === true ? (
                  <Check size={13} strokeWidth={2.5} />
                ) : day.talked === false ? (
                  <X size={13} strokeWidth={2.5} />
                ) : null}
              </div>
              <span className="text-[10px] text-text-muted">{DAY_LABELS[dayOfWeek]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
