"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { signInWithGoogle } from "@/lib/supabase-browser";
import { createClient } from "@/lib/supabase-browser";

const STEPS = ["ask", "value", "features"] as const;
type Step = (typeof STEPS)[number];

function ProgressBar({ step }: { step: Step }) {
  const idx = STEPS.indexOf(step);
  const pct = (idx / (STEPS.length - 1)) * 100;
  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-border/50">
      <div
        className="h-full bg-[#1a1a1a] transition-all duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function DelayedButton({ onClick, label, delay = 5000 }: { onClick: () => void; label: string; delay?: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className={`transition-all duration-700 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6 pointer-events-none"
      }`}
      style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
    >
      <button
        onClick={onClick}
        className="w-full bg-[#1a1a1a] text-white py-4 rounded-2xl font-semibold text-[15px] press"
      >
        {label}
      </button>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(() => {
    try {
      const saved = typeof window !== "undefined" && sessionStorage.getItem("wingmate-onboarding-step");
      if (saved && STEPS.includes(saved as Step)) return saved as Step;
    } catch {}
    return "ask";
  });
  const [stepKey, setStepKey] = useState(0);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  // Redirect to home if user is already logged in
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        router.replace("/");
      }
    });

    // Listen for auth completion from PWA popup
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "auth-complete" && e.newValue) {
        router.replace("/");
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [router]);

  const goToStep = (s: Step) => {
    setStep(s);
    setStepKey((k) => k + 1);
    try { sessionStorage.setItem("wingmate-onboarding-step", s); } catch {}
  };

  const handleCheckout = async (plan: "monthly" | "yearly") => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
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

  const handleSkip = () => {
    signInWithGoogle();
  };

  // Step 1: The question
  if (step === "ask") {
    return (
      <>
        <ProgressBar step={step} />
        <main key={stepKey} className="min-h-screen max-w-md mx-auto flex flex-col justify-between px-7 pt-24 pb-12">
          <div>
            <p className="text-[40px] mb-10 onb-emoji">🤔</p>
            <p className="text-[20px] leading-[1.6] tracking-[-0.01em] text-text font-medium onb-title">
              Ask yourself if there&apos;s been an opportunity in the past 30 days where you had the chance to approach a smoking hot girl but you didn&apos;t because you had approach anxiety.
            </p>
          </div>

          <DelayedButton onClick={() => goToStep("value")} label="Next" />
        </main>
      </>
    );
  }

  // Step 2: The value proposition
  if (step === "value") {
    return (
      <>
        <ProgressBar step={step} />
        <main key={stepKey} className="min-h-screen max-w-md mx-auto flex flex-col justify-between px-7 pt-12 pb-12">
          <div>
            <button onClick={() => goToStep("ask")} className="p-1 -ml-1 mb-8 press">
              <ArrowLeft size={20} strokeWidth={1.5} />
            </button>
            <p className="text-[40px] mb-10 onb-emoji">💰</p>
            <p className="text-[20px] leading-[1.6] tracking-[-0.01em] text-text font-medium onb-title">
              Let&apos;s say you buy a Wingmate subscription for $20 a month.
            </p>
            <p className="text-[17px] leading-[1.65] text-text-muted mt-6 onb-body">
              Since you&apos;re now financially committed to talking to more girls, you&apos;re going to talk to 1 more girl per week and 4 more girls per month.
            </p>
            <p className="text-[17px] leading-[1.65] text-text-muted mt-5 onb-body-2">
              This will improve your rizz skills, create more fun memories, make more valuable connections, and maybe even have sex more often.
            </p>
            <p className="text-[20px] leading-[1.6] tracking-[-0.01em] text-text font-semibold mt-8 onb-body-2">
              All of this is definitely worth $20.
            </p>
          </div>

          <DelayedButton onClick={() => goToStep("features")} label="Next" />
        </main>
      </>
    );
  }

  // Step 3: Features + plan options + skip
  return (
    <>
      <ProgressBar step={step} />
      <main key={stepKey} className="min-h-screen max-w-md mx-auto flex flex-col px-7 pt-12 pb-12">
        <button onClick={() => goToStep("value")} className="p-1 -ml-1 mb-8 press">
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>

        <div className="mb-10">
          <p className="text-[17px] leading-[1.65] text-text onb-title">
            Wingmate has an AI chat bot that will inspire you to talk to a hot girl whenever you have approach anxiety.
          </p>
          <p className="text-[17px] leading-[1.65] text-text mt-5 onb-body">
            Wingmate also has a community of the most dedicated cold approachers who talk to each other and provide updates on their conquests.
          </p>
          <p className="text-[17px] leading-[1.65] text-text mt-5 onb-body-2">
            Wingmate also allows you to set goals on how many cold approaches you want to make per week and track exactly how many girls you approach over time.
          </p>
        </div>

        {/* Plan cards */}
        <div className="space-y-3 mb-4 onb-goals">
          {/* Yearly */}
          <div className="bg-bg-card border-2 border-[#1a1a1a] rounded-2xl p-5 relative">
            <span className="absolute -top-2.5 left-5 bg-green-500 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
              Best value
            </span>
            <div className="flex items-center justify-between mb-3 mt-1">
              <h3 className="font-display text-[16px] font-bold">Pro Yearly</h3>
              <div className="flex items-baseline gap-1.5">
                <span className="text-text-muted text-[16px] font-bold line-through">$20</span>
                <span className="font-display text-[22px] font-extrabold">$15</span>
                <span className="text-text-muted text-[13px]">/mo</span>
              </div>
            </div>
            <div className="space-y-2 mb-4">
              {["Unlimited AI coaching", "Approach tracker & stats", "Daily check-ins & streaks", "Community access"].map((f) => (
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
              {checkoutLoading === "yearly" ? "Redirecting..." : "Get started — $15/mo"}
            </button>
          </div>

          {/* Monthly */}
          <div className="bg-bg-card border border-border rounded-2xl shadow-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-[16px] font-bold">Pro Monthly</h3>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-[22px] font-extrabold">$20</span>
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
          onClick={handleSkip}
          className="w-full flex items-center justify-center gap-3 bg-white border border-border py-3.5 rounded-2xl font-semibold text-[15px] press mt-2 shadow-sm"
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Sign in with Google
        </button>
      </main>
    </>
  );
}
