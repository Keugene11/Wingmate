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
  const [step, setStep] = useState<Step>("ask");
  const [stepKey, setStepKey] = useState(0);

  const goToStep = (s: Step) => {
    setStep(s);
    setStepKey((k) => k + 1);
  };

  // Step 1: The question
  if (step === "ask") {
    return (
      <main key={stepKey} className="min-h-screen max-w-md mx-auto flex flex-col justify-between px-7 pt-24 pb-12">
        <ProgressBar step={step} />

        <div>
          <p className="text-[40px] mb-10 onb-emoji">🤔</p>
          <p className="text-[20px] leading-[1.6] tracking-[-0.01em] text-text font-medium onb-title">
            Ask yourself if there&apos;s been an opportunity in the past 30 days where you had the chance to approach a smoking hot girl but you didn&apos;t because you had approach anxiety.
          </p>
        </div>

        <DelayedButton onClick={() => goToStep("value")} label="Next" />
      </main>
    );
  }

  // Step 2: The value proposition → sign in
  return (
    <main key={stepKey} className="min-h-screen max-w-md mx-auto flex flex-col justify-between px-7 pt-24 pb-12">
      <ProgressBar step={step} />

      <div>
        <p className="text-[40px] mb-10 onb-emoji">💰</p>
        <p className="text-[20px] leading-[1.6] tracking-[-0.01em] text-text font-medium onb-title">
          Let&apos;s say you buy a Wingmate subscription for $15 a month.
        </p>
        <p className="text-[17px] leading-[1.65] text-text-muted mt-6 onb-body">
          Since you&apos;re now financially committed to talking to more girls, you&apos;re going to talk to 1 more girl per week and 4 more girls per month.
        </p>
        <p className="text-[17px] leading-[1.65] text-text-muted mt-5 onb-body-2">
          This will improve your rizz skills, create more fun memories, make more valuable connections, and maybe even have sex more often.
        </p>
        <p className="text-[20px] leading-[1.6] tracking-[-0.01em] text-text font-semibold mt-8 onb-body-2">
          All of this is definitely worth $15.
        </p>
      </div>

      <DelayedButton onClick={() => signInWithGoogle()} label="Sign in with Google" />
    </main>
  );
}
