"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Heart, Sparkles, Flame, PartyPopper, Pencil, X } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

type Profile = {
  goal: string | null;
  custom_goal: string | null;
  date_of_birth: string | null;
  status: string | null;
  blocker: string | null;
  weekly_approach_goal: number | null;
};

const GOAL_OPTIONS = [
  { id: "girlfriend", icon: Heart, label: "Get a girlfriend" },
  { id: "rizz", icon: Sparkles, label: "Improve my rizz" },
  { id: "hookups", icon: Flame, label: "Meet more people & date casually" },
  { id: "memories", icon: PartyPopper, label: "Just have fun memories" },
];

const STATUS_OPTIONS = [
  { id: "student", label: "Student" },
  { id: "working", label: "In the workforce" },
  { id: "other", label: "Other" },
];

const BLOCKER_OPTIONS = [
  { id: "rejection", label: "Fear of rejection" },
  { id: "words", label: "Don't know what to say" },
  { id: "confidence", label: "Low confidence" },
  { id: "time", label: "Never the right moment" },
];

function labelFor(options: { id: string; label: string }[], id: string | null): string {
  if (!id) return "";
  return options.find((o) => o.id === id)?.label || "";
}

function normalizeDob(raw: string | null | undefined): string {
  if (!raw) return "";
  const s = String(raw);
  return s.length >= 10 ? s.slice(0, 10) : "";
}

function formatBirthday(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function PersonalDetailsPage() {
  const { status: sessionStatus } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const [editingGoals, setEditingGoals] = useState(false);
  const [goalSelection, setGoalSelection] = useState<Set<string>>(new Set());
  const [customGoalInput, setCustomGoalInput] = useState("");
  const [savingGoals, setSavingGoals] = useState(false);

  const [editingBirthday, setEditingBirthday] = useState(false);
  const [birthdayInput, setBirthdayInput] = useState("");
  const [savingBirthday, setSavingBirthday] = useState(false);

  const [editingField, setEditingField] = useState<null | "status" | "blocker" | "weekly">(null);
  const [weeklyInput, setWeeklyInput] = useState<string>("");
  const [savingField, setSavingField] = useState(false);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.profile) setProfile(d.profile);
      })
      .catch(() => {});
  }, [sessionStatus]);

  const startEditingGoals = () => {
    const current = profile?.goal ? new Set(profile.goal.split(",").filter(Boolean)) : new Set<string>();
    setGoalSelection(current);
    setCustomGoalInput(profile?.custom_goal || "");
    setEditingGoals(true);
  };

  const toggleGoalSelection = (id: string) => {
    setGoalSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const saveGoals = async () => {
    setSavingGoals(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goal: Array.from(goalSelection).join(","),
        custom_goal: customGoalInput.trim(),
      }),
    });
    const data = await res.json();
    if (data.profile) setProfile(data.profile);
    setSavingGoals(false);
    setEditingGoals(false);
  };

  const startEditingBirthday = () => {
    setBirthdayInput(normalizeDob(profile?.date_of_birth));
    setEditingBirthday(true);
  };

  const saveBirthday = async () => {
    if (!birthdayInput) {
      setEditingBirthday(false);
      return;
    }
    setSavingBirthday(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date_of_birth: birthdayInput }),
    });
    const data = await res.json();
    if (data.profile) setProfile(data.profile);
    else if (data.error) showToast(data.error);
    setSavingBirthday(false);
    setEditingBirthday(false);
  };

  const savePersonalField = async (body: Record<string, string | number>) => {
    setSavingField(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.profile) setProfile(data.profile);
      else if (data.error) showToast(data.error);
    } catch {
      showToast("Couldn't save — try again");
    }
    setSavingField(false);
    setEditingField(null);
  };

  return (
    <main className="min-h-app max-w-md mx-auto px-5 pt-6 pb-24 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/profile" className="p-1 -ml-1 press">
          <ArrowLeft size={20} strokeWidth={1.5} />
        </Link>
        <h1 className="font-display text-[20px] font-bold tracking-tight">Personal details</h1>
      </div>

      {/* Goal */}
      <div className="bg-bg-card border border-border rounded-xl shadow-card px-4 py-4 mb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[12px] font-semibold text-text-muted uppercase tracking-wide">Goal</p>
          {!editingGoals && (
            <button onClick={startEditingGoals} className="text-[12px] font-medium text-text-muted press">
              Edit
            </button>
          )}
        </div>
        {editingGoals ? (
          <div>
            <div className="space-y-2 mb-3">
              {GOAL_OPTIONS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => toggleGoalSelection(g.id)}
                  className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] font-medium transition-colors ${
                    goalSelection.has(g.id) ? "bg-[#1a1a1a] text-white" : "bg-bg-input text-text"
                  }`}
                >
                  <g.icon size={16} strokeWidth={1.5} />
                  {g.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 bg-bg-input rounded-xl px-3 py-2.5 mb-3">
              <Pencil size={16} strokeWidth={1.5} className="text-text-muted shrink-0" />
              <input
                type="text"
                value={customGoalInput}
                onChange={(e) => setCustomGoalInput(e.target.value.slice(0, 100))}
                placeholder="Custom goal..."
                className="flex-1 bg-transparent text-[14px] placeholder:text-text-muted/50 outline-none"
              />
              {customGoalInput && (
                <button onClick={() => setCustomGoalInput("")} className="press">
                  <X size={14} className="text-text-muted" />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditingGoals(false)}
                className="flex-1 py-2 rounded-xl text-[13px] font-medium bg-bg-input press"
              >
                Cancel
              </button>
              <button
                onClick={saveGoals}
                disabled={savingGoals}
                className="flex-1 py-2 rounded-xl text-[13px] font-medium bg-[#1a1a1a] text-white press disabled:opacity-60"
              >
                {savingGoals ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <div>
            {(() => {
              const goalLabels = (profile?.goal || "").split(",").filter(Boolean).map(
                (g) => GOAL_OPTIONS.find((o) => o.id === g)?.label
              ).filter(Boolean);
              if (profile?.custom_goal) goalLabels.push(profile.custom_goal);
              return goalLabels.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {goalLabels.map((label) => (
                    <span key={label} className="text-[13px] bg-bg-input rounded-lg px-3 py-1.5 font-medium">
                      {label}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-text-muted text-[14px]">No goals set</p>
              );
            })()}
          </div>
        )}
      </div>

      {/* Occupation */}
      <div className="bg-bg-card border border-border rounded-xl shadow-card px-4 py-4 mb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[12px] font-semibold text-text-muted uppercase tracking-wide">Occupation</p>
          {editingField !== "status" && (
            <button onClick={() => setEditingField("status")} className="text-[12px] font-medium text-text-muted press">
              Edit
            </button>
          )}
        </div>
        {editingField === "status" ? (
          <div className="space-y-2">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => savePersonalField({ status: opt.id })}
                disabled={savingField}
                className={`w-full text-left rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors ${
                  profile?.status === opt.id ? "bg-[#1a1a1a] text-white" : "bg-bg-input text-text"
                }`}
              >
                {opt.label}
              </button>
            ))}
            <button
              onClick={() => setEditingField(null)}
              className="w-full py-2 rounded-xl text-[13px] font-medium bg-bg-input press"
            >
              Cancel
            </button>
          </div>
        ) : profile?.status ? (
          <p className="text-[14px] font-medium">{labelFor(STATUS_OPTIONS, profile.status)}</p>
        ) : (
          <p className="text-text-muted text-[14px]">Not set</p>
        )}
      </div>

      {/* What's stopping me */}
      <div className="bg-bg-card border border-border rounded-xl shadow-card px-4 py-4 mb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[12px] font-semibold text-text-muted uppercase tracking-wide">What&apos;s stopping me</p>
          {editingField !== "blocker" && (
            <button onClick={() => setEditingField("blocker")} className="text-[12px] font-medium text-text-muted press">
              Edit
            </button>
          )}
        </div>
        {editingField === "blocker" ? (
          <div className="space-y-2">
            {BLOCKER_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => savePersonalField({ blocker: opt.id })}
                disabled={savingField}
                className={`w-full text-left rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors ${
                  profile?.blocker === opt.id ? "bg-[#1a1a1a] text-white" : "bg-bg-input text-text"
                }`}
              >
                {opt.label}
              </button>
            ))}
            <button
              onClick={() => setEditingField(null)}
              className="w-full py-2 rounded-xl text-[13px] font-medium bg-bg-input press"
            >
              Cancel
            </button>
          </div>
        ) : profile?.blocker ? (
          <p className="text-[14px] font-medium">{labelFor(BLOCKER_OPTIONS, profile.blocker)}</p>
        ) : (
          <p className="text-text-muted text-[14px]">Not set</p>
        )}
      </div>

      {/* Weekly target */}
      <div className="bg-bg-card border border-border rounded-xl shadow-card px-4 py-4 mb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[12px] font-semibold text-text-muted uppercase tracking-wide">Weekly target</p>
          {editingField !== "weekly" && (
            <button
              onClick={() => {
                setWeeklyInput(String(profile?.weekly_approach_goal ?? 5));
                setEditingField("weekly");
              }}
              className="text-[12px] font-medium text-text-muted press"
            >
              Edit
            </button>
          )}
        </div>
        {editingField === "weekly" ? (
          <div>
            <div className="flex items-center gap-2 bg-bg-input rounded-xl px-3 py-2.5 mb-3">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={20}
                value={weeklyInput}
                onChange={(e) => setWeeklyInput(e.target.value)}
                className="flex-1 bg-transparent text-[14px] outline-none"
                autoFocus
              />
              <span className="text-[13px] text-text-muted">girls / week</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditingField(null)}
                className="flex-1 py-2 rounded-xl text-[13px] font-medium bg-bg-input press"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const n = parseInt(weeklyInput, 10);
                  if (Number.isNaN(n) || n < 1 || n > 20) {
                    showToast("Pick a number between 1 and 20");
                    return;
                  }
                  savePersonalField({ weekly_approach_goal: n });
                }}
                disabled={savingField}
                className="flex-1 py-2 rounded-xl text-[13px] font-medium bg-[#1a1a1a] text-white press disabled:opacity-60"
              >
                {savingField ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        ) : profile?.weekly_approach_goal && profile.weekly_approach_goal > 0 ? (
          <p className="text-[14px] font-medium">
            {profile.weekly_approach_goal} <span className="text-text-muted font-normal">girls / week</span>
          </p>
        ) : (
          <p className="text-text-muted text-[14px]">Not set</p>
        )}
      </div>

      {/* Birthday */}
      <div className="bg-bg-card border border-border rounded-xl shadow-card px-4 py-4 mb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[12px] font-semibold text-text-muted uppercase tracking-wide">Birthday</p>
          {!editingBirthday && (
            <button onClick={startEditingBirthday} className="text-[12px] font-medium text-text-muted press">
              Edit
            </button>
          )}
        </div>
        {editingBirthday ? (
          <div>
            <input
              type="date"
              value={birthdayInput}
              onChange={(e) => setBirthdayInput(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className="w-full bg-bg-input rounded-xl px-3 py-2.5 text-[14px] font-medium outline-none mb-3"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setEditingBirthday(false)}
                className="flex-1 py-2 rounded-xl text-[13px] font-medium bg-bg-input press"
              >
                Cancel
              </button>
              <button
                onClick={saveBirthday}
                disabled={savingBirthday || !birthdayInput}
                className="flex-1 py-2 rounded-xl text-[13px] font-medium bg-[#1a1a1a] text-white press disabled:opacity-60"
              >
                {savingBirthday ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-[14px] font-medium">
            {profile?.date_of_birth ? formatBirthday(normalizeDob(profile.date_of_birth)) : (
              <span className="text-text-muted">Not set</span>
            )}
          </p>
        )}
      </div>

      {toast && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[100] bg-[#1a1a1a] text-white text-[13px] font-medium px-5 py-2.5 rounded-full shadow-lg animate-fade-in">
          {toast}
        </div>
      )}
    </main>
  );
}
