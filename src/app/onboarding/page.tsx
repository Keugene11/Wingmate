"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Heart, Sparkles, Flame, PartyPopper, Pencil, Check, MessageCircle } from "lucide-react";
import { createClient, signInWithGoogle } from "@/lib/supabase-browser";

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

const STEPS = ["remember", "regret", "aicoach", "community", "goals", "pitch", "motivation"] as const;
type Step = (typeof STEPS)[number];

function ProgressBar({ step }: { step: Step }) {
  const idx = STEPS.indexOf(step);
  const pct = ((idx + 1) / STEPS.length) * 100;
  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-border/50">
      <div
        className="h-full bg-[#1a1a1a] transition-all duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function DelayedButton({ onClick, label, delay = 2500 }: { onClick: () => void; label: string; delay?: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <button
      onClick={onClick}
      className={`w-full bg-[#1a1a1a] text-white py-3.5 rounded-2xl font-semibold text-[15px] press transition-all duration-500 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"
      }`}
    >
      {label}
    </button>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [customGoal, setCustomGoal] = useState("");
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<Step>("remember");
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [stepKey, setStepKey] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
    });
  }, []);

  const goToStep = (s: Step) => {
    setStep(s);
    setStepKey((k) => k + 1);
  };

  const toggleGoal = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const hasAnyGoal = selected.size > 0 || customGoal.trim().length > 0;

  const handleContinue = async () => {
    if (!hasAnyGoal) return;
    setSaving(true);
    const goalData: Record<string, string> = { goal: Array.from(selected).join(","), custom_goal: customGoal.trim() || "" };
    try { sessionStorage.setItem("wingmate-onboarding-goals", JSON.stringify(goalData)); } catch {}
    if (isLoggedIn) {
      try {
        await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(goalData),
        });
      } catch {}
    }
    setSaving(false);
    goToStep("pitch");
  };

  const selectedGoalLabels = Array.from(selected)
    .map((id) => GOALS.find((g) => g.id === id)?.label)
    .filter(Boolean) as string[];
  if (customGoal.trim()) selectedGoalLabels.push(customGoal.trim());

  if (step === "remember") {
    return (
      <main key={stepKey} className="min-h-screen max-w-md mx-auto px-6 flex flex-col justify-center py-12">
        <ProgressBar step={step} />
        <div className="text-center mb-12">
          <p className="text-[48px] mb-6 onb-emoji">💭</p>
          <h1 className="font-display text-[28px] font-extrabold tracking-tight leading-[1.15] mb-4 onb-title">
            Remember that girl you couldn&apos;t stop thinking about?
          </h1>
          <p className="text-text-muted text-[16px] leading-relaxed max-w-[340px] mx-auto onb-body">
            Your heart raced every time you saw her. You imagined what it&apos;d be like to talk to her, make her laugh, get to know her. But you never walked up — because the fear was louder than the desire.
          </p>
          <p className="text-text text-[16px] leading-relaxed max-w-[340px] mx-auto mt-4 font-medium onb-body-2">
            That ends now.
          </p>
        </div>

        <DelayedButton onClick={() => goToStep("regret")} label="Next" />
      </main>
    );
  }

  if (step === "regret") {
    return (
      <main key={stepKey} className="min-h-screen max-w-md mx-auto px-6 flex flex-col justify-center py-12">
        <ProgressBar step={step} />
        <div className="text-center mb-12">
          <p className="text-[48px] mb-6 onb-emoji">😔</p>
          <h1 className="font-display text-[28px] font-extrabold tracking-tight leading-[1.15] mb-4 onb-title">
            Then someone else walked up to her instead.
          </h1>
          <p className="text-text-muted text-[16px] leading-relaxed max-w-[340px] mx-auto onb-body">
            Some other guy had the courage you didn&apos;t. He walked over, made her smile, and you just stood there — watching your chance disappear. You knew you could&apos;ve been that guy.
          </p>
          <p className="text-text text-[16px] leading-relaxed max-w-[340px] mx-auto mt-4 font-medium onb-body-2">
            Never again.
          </p>
        </div>

        <DelayedButton onClick={() => goToStep("aicoach")} label="Next" />
      </main>
    );
  }

  if (step === "aicoach") {
    return (
      <main key={stepKey} className="min-h-screen max-w-md mx-auto px-6 flex flex-col justify-center py-12">
        <ProgressBar step={step} />
        <div className="text-center mb-12">
          <div className="w-16 h-16 rounded-2xl bg-[#1a1a1a] flex items-center justify-center mx-auto mb-6 onb-emoji">
            <MessageCircle size={28} strokeWidth={1.5} className="text-white" />
          </div>
          <h1 className="font-display text-[28px] font-extrabold tracking-tight leading-[1.15] mb-4 onb-title">
            A coach in your pocket for the exact moment you need it.
          </h1>
          <p className="text-text-muted text-[16px] leading-relaxed max-w-[340px] mx-auto onb-body">
            You see a cute girl. Your heart&apos;s pounding. You&apos;re frozen. That&apos;s when you open Wingmate.
          </p>
          <p className="text-text-muted text-[16px] leading-relaxed max-w-[340px] mx-auto mt-4 onb-body-2">
            Tell it where you are, what she looks like, what&apos;s holding you back. It gives you the exact words to say, kills your excuses, and fires you up to go — right now.
          </p>
        </div>

        <DelayedButton onClick={() => goToStep("community")} label="Next" />
      </main>
    );
  }

  if (step === "community") {
    return (
      <main key={stepKey} className="min-h-screen max-w-md mx-auto px-6 flex flex-col justify-center py-12">
        <ProgressBar step={step} />
        <div className="text-center mb-12">
          <p className="text-[48px] mb-6 onb-emoji">🤝</p>
          <h1 className="font-display text-[28px] font-extrabold tracking-tight leading-[1.15] mb-4 onb-title">
            You&apos;re not doing this alone.
          </h1>
          <p className="text-text-muted text-[16px] leading-relaxed max-w-[340px] mx-auto onb-body">
            Most guys don&apos;t have friends who get this. Wingmate has a community of guys on the same path — sharing wins, tips, and real experiences. It&apos;s like having a group of wingmen who actually push you forward.
          </p>
        </div>

        <DelayedButton onClick={() => goToStep("goals")} label="Next" />
      </main>
    );
  }

  if (step === "pitch") {
    const handleCheckout = async (plan: "monthly" | "yearly") => {
      if (!isLoggedIn) {
        try { sessionStorage.setItem("wingmate-checkout-plan", plan); } catch {}
        signInWithGoogle();
        return;
      }
      setCheckoutLoading(plan);
      try {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
          return;
        }
      } catch {}
      setCheckoutLoading(null);
    };

    return (
      <main key={stepKey} className="min-h-screen max-w-md mx-auto px-6 flex flex-col justify-center py-12">
        <ProgressBar step={step} />
        <div className="text-center mb-8">
          <p className="text-[48px] mb-6 onb-emoji">🔥</p>
          <h1 className="font-display text-[28px] font-extrabold tracking-tight leading-[1.15] mb-4 onb-title">
            What if you never missed another opportunity?
          </h1>
          <p className="text-text-muted text-[16px] leading-relaxed max-w-[340px] mx-auto onb-body">
            Imagine having the confidence to approach any girl, anywhere — before the overthinking kicks in. Imagine how different your life looks six months from now.
          </p>
        </div>

        {/* Plan cards */}
        <div className="space-y-3 mb-4 onb-goals">
          {/* Yearly — best value, shown first */}
          <div className="bg-bg-card border-2 border-[#1a1a1a] rounded-2xl p-5 relative">
            <span className="absolute -top-2.5 left-5 bg-green-500 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
              Best value
            </span>
            <div className="flex items-center justify-between mb-3 mt-1">
              <h3 className="font-display text-[16px] font-bold">Pro Yearly</h3>
              <div className="flex items-baseline gap-1.5">
                <span className="text-text-muted text-[16px] font-bold line-through">$15</span>
                <span className="font-display text-[22px] font-extrabold">$10</span>
                <span className="text-text-muted text-[13px]">/mo</span>
              </div>
            </div>
            <div className="space-y-2 mb-4">
              {["AI coach for in-the-moment help", "Daily check-ins & streak tracker", "Community of cold approachers"].map((f) => (
                <div key={f} className="flex items-center gap-2">
                  <Check size={14} strokeWidth={2.5} className="text-[#1a1a1a] shrink-0" />
                  <span className="text-[13px]">{f}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => handleCheckout("yearly")}
              disabled={!!checkoutLoading}
              className="w-full bg-[#1a1a1a] text-white py-2.5 rounded-xl font-semibold text-[14px] press disabled:opacity-60"
            >
              {checkoutLoading === "yearly" ? "Redirecting..." : "Get started — $10/mo"}
            </button>
          </div>

          {/* Monthly */}
          <div className="bg-bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-[16px] font-bold">Pro Monthly</h3>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-[22px] font-extrabold">$15</span>
                <span className="text-text-muted text-[13px]">/mo</span>
              </div>
            </div>
            <button
              onClick={() => handleCheckout("monthly")}
              disabled={!!checkoutLoading}
              className="w-full bg-bg-input text-text py-2.5 rounded-xl font-semibold text-[14px] press disabled:opacity-60"
            >
              {checkoutLoading === "monthly" ? "Redirecting..." : "Subscribe monthly"}
            </button>
          </div>
        </div>

        <button
          onClick={() => goToStep("motivation")}
          className="text-text-muted text-[14px] font-medium py-3 press onb-body-2"
        >
          Maybe later
        </button>
      </main>
    );
  }

  if (step === "motivation") {
    return (
      <main key={stepKey} className="min-h-screen max-w-md mx-auto px-6 flex flex-col justify-center py-12">
        <ProgressBar step={step} />
        <div className="text-center mb-12">
          <p className="text-[48px] mb-6 onb-emoji">🫵</p>
          <h1 className="font-display text-[28px] font-extrabold tracking-tight leading-[1.15] mb-4 onb-title">
            Next time you see her and get nervous — remember why you&apos;re here.
          </h1>

          {selectedGoalLabels.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mb-6 onb-goals">
              {selectedGoalLabels.map((label) => (
                <span
                  key={label}
                  className="text-[14px] bg-[#1a1a1a] text-white rounded-full px-4 py-1.5 font-medium"
                >
                  {label}
                </span>
              ))}
            </div>
          )}

          <p className="text-text-muted text-[16px] leading-relaxed max-w-[340px] mx-auto onb-body">
            Take a breath. Walk over. Say something. That&apos;s how everything changes.
          </p>
        </div>

        <DelayedButton
          onClick={() => {
            if (isLoggedIn) {
              router.replace("/");
            } else {
              signInWithGoogle();
            }
          }}
          label={isLoggedIn ? "Let's go" : "Sign in with Google"}
        />
      </main>
    );
  }

  // goals step (default)
  return (
    <main className="min-h-screen max-w-md mx-auto px-6 flex flex-col justify-center py-12 animate-fade-in">
      <ProgressBar step={step} />
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

      <div className="space-y-3 mb-4 stagger">
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

      {/* Custom goal */}
      <div className="flex items-center gap-3 bg-bg-card border-2 border-border rounded-2xl px-5 py-4 mb-10 animate-slide-up" style={{ animationDelay: "280ms" }}>
        <div className="w-10 h-10 rounded-xl bg-bg-input flex items-center justify-center shrink-0">
          <Pencil size={20} strokeWidth={1.5} className="text-text" />
        </div>
        <input
          type="text"
          value={customGoal}
          onChange={(e) => setCustomGoal(e.target.value.slice(0, 100))}
          placeholder="Or type your own goal..."
          className="flex-1 bg-transparent text-[15px] font-medium placeholder:text-text-muted/50 outline-none"
        />
      </div>

      <button
        onClick={handleContinue}
        disabled={!hasAnyGoal || saving}
        className="w-full bg-[#1a1a1a] text-white py-3.5 rounded-2xl font-semibold text-[15px] press disabled:opacity-40 transition-opacity animate-slide-up"
        style={{ animationDelay: "350ms" }}
      >
        {saving ? "Saving..." : "Continue"}
      </button>
    </main>
  );
}
