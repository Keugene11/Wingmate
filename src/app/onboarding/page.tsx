"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Sparkles, Flame, PartyPopper } from "lucide-react";

const GOALS = [
  {
    id: "girlfriend",
    icon: Heart,
    label: "Get a girlfriend",
    description: "Find someone special and build a real connection.",
  },
  {
    id: "rizz",
    icon: Sparkles,
    label: "Improve my rizz",
    description: "Get smoother, more confident, and better with words.",
  },
  {
    id: "hookups",
    icon: Flame,
    label: "Hook up with girls",
    description: "Meet girls, have fun, and enjoy the moment.",
  },
  {
    id: "memories",
    icon: PartyPopper,
    label: "Just have fun memories",
    description: "Live life, meet new people, and make great stories.",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<"goals" | "motivation">("goals");

  const toggleGoal = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleContinue = async () => {
    if (selected.size === 0) return;
    setSaving(true);
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: Array.from(selected).join(",") }),
      });
      setSaving(false);
      setStep("motivation");
    } catch {
      setSaving(false);
    }
  };

  if (step === "motivation") {
    return (
      <main className="min-h-screen max-w-md mx-auto px-6 flex flex-col justify-center py-12 animate-fade-in">
        <div className="text-center mb-12">
          <p className="text-[48px] mb-6">🫵</p>
          <h1 className="font-display text-[28px] font-extrabold tracking-tight leading-[1.15] mb-4">
            Next time you see a girl and get nervous, remember why you&apos;re here.
          </h1>
          <p className="text-text-muted text-[16px] leading-relaxed max-w-[340px] mx-auto">
            Remember your goals. Take a breath. And go talk to her. That&apos;s how everything changes.
          </p>
        </div>

        <button
          onClick={() => router.replace("/")}
          className="w-full bg-[#1a1a1a] text-white py-3.5 rounded-2xl font-semibold text-[15px] press"
        >
          Let&apos;s go
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen max-w-md mx-auto px-6 flex flex-col justify-center py-12 animate-fade-in">
      <div className="mb-10">
        <p className="font-display text-[15px] font-bold tracking-tight text-text-muted/40 mb-6">
          Wingmate
        </p>
        <h1 className="font-display text-[28px] font-extrabold tracking-tight leading-[1.15] mb-3">
          What&apos;s your goal?
        </h1>
        <p className="text-text-muted text-[15px] leading-relaxed">
          Pick all that apply. This helps your AI coach give you the right advice.
        </p>
      </div>

      <div className="space-y-3 mb-10">
        {GOALS.map((goal) => (
          <button
            key={goal.id}
            onClick={() => toggleGoal(goal.id)}
            className={`w-full flex items-center gap-4 rounded-2xl px-5 py-4 text-left press transition-colors ${
              selected.has(goal.id)
                ? "bg-[#1a1a1a] text-white border-2 border-[#1a1a1a]"
                : "bg-bg-card border-2 border-border"
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                selected.has(goal.id) ? "bg-white/15" : "bg-bg-input"
              }`}
            >
              <goal.icon
                size={20}
                strokeWidth={1.5}
                className={selected.has(goal.id) ? "text-white" : "text-text"}
              />
            </div>
            <div>
              <p className="font-display text-[15px] font-bold">{goal.label}</p>
              <p
                className={`text-[13px] leading-relaxed mt-0.5 ${
                  selected.has(goal.id) ? "text-white/60" : "text-text-muted"
                }`}
              >
                {goal.description}
              </p>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={handleContinue}
        disabled={selected.size === 0 || saving}
        className="w-full bg-[#1a1a1a] text-white py-3.5 rounded-2xl font-semibold text-[15px] press disabled:opacity-40 transition-opacity"
      >
        {saving ? "Saving..." : "Continue"}
      </button>
    </main>
  );
}
