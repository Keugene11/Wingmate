"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Heart, Sparkles, Flame, PartyPopper, Pencil, Check } from "lucide-react";

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

function DelayedButton({ onClick, label, delay = 3000 }: { onClick: () => void; label: string; delay?: number }) {
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
  const [step, setStep] = useState<"goals" | "remember" | "regret" | "community" | "pitch" | "motivation">("goals");
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [stepKey, setStepKey] = useState(0);

  const goToStep = (s: typeof step) => {
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
    try {
      const body: Record<string, string> = { goal: Array.from(selected).join(",") };
      if (customGoal.trim()) body.custom_goal = customGoal.trim();
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setSaving(false);
      goToStep("remember");
    } catch {
      setSaving(false);
    }
  };

  const selectedGoalLabels = Array.from(selected)
    .map((id) => GOALS.find((g) => g.id === id)?.label)
    .filter(Boolean) as string[];
  if (customGoal.trim()) selectedGoalLabels.push(customGoal.trim());

  if (step === "remember") {
    return (
      <main key={stepKey} className="min-h-screen max-w-md mx-auto px-6 flex flex-col justify-center py-12">
        <div className="text-center mb-12">
          <p className="text-[48px] mb-6 onb-emoji">💭</p>
          <h1 className="font-display text-[28px] font-extrabold tracking-tight leading-[1.15] mb-4 onb-title">
            Remember that crush you had?
          </h1>
          <p className="text-text-muted text-[16px] leading-relaxed max-w-[340px] mx-auto onb-body">
            She was so beautiful. Your heart would pound every time you saw her. Or that stunning girl at the airport, or in one of your classes. You imagined what it&apos;d be like to talk to them, make memories together, get to know them. But you never had the guts to walk up — because you were too scared.
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
        <div className="text-center mb-12">
          <p className="text-[48px] mb-6 onb-emoji">😔</p>
          <h1 className="font-display text-[28px] font-extrabold tracking-tight leading-[1.15] mb-4 onb-title">
            Remember when someone else approached her instead?
          </h1>
          <p className="text-text-muted text-[16px] leading-relaxed max-w-[340px] mx-auto onb-body">
            Some guy with more balls walked up to your crush, and you just stood there watching. You felt like a complete loser — no confidence, no guts. You lost your opportunity and you knew it.
          </p>
          <p className="text-text text-[16px] leading-relaxed max-w-[340px] mx-auto mt-4 font-medium onb-body-2">
            Never again.
          </p>
        </div>

        <DelayedButton onClick={() => goToStep("community")} label="Next" />
      </main>
    );
  }

  if (step === "community") {
    return (
      <main key={stepKey} className="min-h-screen max-w-md mx-auto px-6 flex flex-col justify-center py-12">
        <div className="text-center mb-12">
          <p className="text-[48px] mb-6 onb-emoji">🤝</p>
          <h1 className="font-display text-[28px] font-extrabold tracking-tight leading-[1.15] mb-4 onb-title">
            Tired of having no one who gets it?
          </h1>
          <p className="text-text-muted text-[16px] leading-relaxed max-w-[340px] mx-auto onb-body">
            Most guys don&apos;t have friends who are into cold approaching and meeting women. Wingmate has a community of guys just like you — sharing their experiences, thoughts, tips, and wins. You&apos;re not in this alone.
          </p>
        </div>

        <DelayedButton onClick={() => goToStep("pitch")} label="Next" />
      </main>
    );
  }

  if (step === "pitch") {
    const handleCheckout = async (plan: "monthly" | "yearly") => {
      setCheckoutLoading(plan);
      try {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        });
        const data = await res.json();
        if (data.url) window.location.href = data.url;
      } catch {
        setCheckoutLoading(null);
      }
    };

    return (
      <main key={stepKey} className="min-h-screen max-w-md mx-auto px-6 flex flex-col justify-center py-12">
        <div className="text-center mb-8">
          <p className="text-[48px] mb-6 onb-emoji">🔥</p>
          <h1 className="font-display text-[28px] font-extrabold tracking-tight leading-[1.15] mb-4 onb-title">
            Imagine if you never missed another opportunity.
          </h1>
          <p className="text-text-muted text-[16px] leading-relaxed max-w-[340px] mx-auto onb-body">
            Remember the good moments you&apos;ve had with girls. Now imagine having the confidence and cold approach skills so that whenever you see a stunning girl in public, you react instantly and approach her before overthinking it. Imagine how different your life would be if you just went for it every single time.
          </p>
          <p className="text-text text-[16px] leading-relaxed max-w-[340px] mx-auto mt-4 font-medium onb-body-2">
            All of that is definitely worth $15/mo.
          </p>
        </div>

        {/* Plan cards */}
        <div className="space-y-3 mb-4 onb-goals">
          {/* Monthly */}
          <div className="bg-bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-[16px] font-bold">Pro Monthly</h3>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-[22px] font-extrabold">$15</span>
                <span className="text-text-muted text-[13px]">/mo</span>
              </div>
            </div>
            <div className="space-y-2 mb-4">
              {["AI coach for in-the-moment help", "Daily check-ins & streak tracker", "Community of cold approachers"].map((f) => (
                <div key={f} className="flex items-center gap-2">
                  <Check size={14} strokeWidth={2.5} className="text-text-muted shrink-0" />
                  <span className="text-[13px]">{f}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => handleCheckout("monthly")}
              disabled={!!checkoutLoading}
              className="w-full bg-bg-input text-text py-2.5 rounded-xl font-semibold text-[14px] press disabled:opacity-60"
            >
              {checkoutLoading === "monthly" ? "Redirecting..." : "Subscribe monthly"}
            </button>
          </div>

          {/* Yearly */}
          <div className="bg-bg-card border-2 border-[#1a1a1a] rounded-2xl p-5 relative">
            <span className="absolute -top-2.5 left-5 bg-green-500 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
              Save 33%
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
              {checkoutLoading === "yearly" ? "Redirecting..." : "Subscribe yearly"}
            </button>
          </div>
        </div>

        <button
          onClick={() => goToStep("motivation")}
          className="text-text-muted text-[14px] font-medium py-3 press onb-body-2"
        >
          Skip for now
        </button>
      </main>
    );
  }

  if (step === "motivation") {
    return (
      <main key={stepKey} className="min-h-screen max-w-md mx-auto px-6 flex flex-col justify-center py-12">
        <div className="text-center mb-12">
          <p className="text-[48px] mb-6 onb-emoji">🫵</p>
          <h1 className="font-display text-[28px] font-extrabold tracking-tight leading-[1.15] mb-4 onb-title">
            Next time you see a girl and get nervous, remember why you&apos;re here.
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
            Take a breath. And go talk to her. That&apos;s how everything changes.
          </p>
        </div>

        <DelayedButton onClick={() => router.replace("/")} label="Let's go" />
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
