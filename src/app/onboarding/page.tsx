"use client";

import { useState, useEffect } from "react";
import { signInWithGoogle } from "@/lib/supabase-browser";

const STEPS = ["ask", "value"] as const;
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
  const [step, setStep] = useState<Step>("ask");
  const [stepKey, setStepKey] = useState(0);

  const goToStep = (s: Step) => {
    setStep(s);
    setStepKey((k) => k + 1);
  };

  // Step 1: The question
  if (step === "ask") {
    return (
      <main key={stepKey} className="min-h-screen max-w-md mx-auto px-6 flex flex-col justify-center py-12">
        <ProgressBar step={step} />
        <div className="text-center mb-12">
          <p className="text-[48px] mb-6 onb-emoji">🤔</p>
          <h1 className="font-display text-[22px] font-extrabold tracking-tight leading-[1.25] onb-title">
            Ask yourself if there&apos;s been an opportunity in the past 30 days where you had the chance to approach a smoking hot girl but you didn&apos;t because you had approach anxiety
          </h1>
        </div>

        <DelayedButton onClick={() => goToStep("value")} label="Next" />
      </main>
    );
  }

  // Step 2: The value proposition → sign in
  return (
    <main key={stepKey} className="min-h-screen max-w-md mx-auto px-6 flex flex-col justify-center py-12">
      <ProgressBar step={step} />
      <div className="text-center mb-12">
        <p className="text-[48px] mb-6 onb-emoji">💰</p>
        <h1 className="font-display text-[22px] font-extrabold tracking-tight leading-[1.25] onb-title">
          Let&apos;s say you buy a Wingmate subscription for $15 a month. Since you&apos;re now financially committed to talking to more girls, you&apos;re going to talk to 1 more girl per week and 4 more girls per month. This will improve your rizz skills, create more fun memories, make more valuable connections, and maybe even have sex more often. All of this is definitely worth $15.
        </h1>
      </div>

      <DelayedButton onClick={() => signInWithGoogle()} label="Sign in with Google" />
    </main>
  );
}
