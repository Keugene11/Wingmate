"use client";

import { useEffect, Suspense, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithGoogle, signInWithApple } from "@/lib/auth-client";
import { useSession } from "next-auth/react";
import { hideSplash, setupAuthDeepLinkListener, initSocialLogin } from "@/lib/capacitor";

type Step =
  | "welcome"
  | "approaches"
  | "source"
  | "experience"
  | "pitch"
  | "birthday"
  | "goal"
  | "target"
  | "doable"
  | "thanks"
  | "notifications"
  | "auth";

const TARGET_MIN = 1;
const TARGET_MAX = 30;

const GOAL_OPTIONS = [
  { id: "girlfriend", label: "Get a girlfriend", emoji: "💖" },
  { id: "rizz", label: "Improve my rizz", emoji: "🎯" },
  { id: "memories", label: "Make fun memories", emoji: "🎉" },
] as const;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function daysInMonth(month: number, year: number): number {
  return new Date(year, month + 1, 0).getDate();
}

const EXPERIENCE_OPTIONS = [
  { id: "yes", label: "Yes", emoji: "👍" },
  { id: "no", label: "No", emoji: "👎" },
] as const;

const APPROACH_OPTIONS = [
  { id: "few", label: "0–2", sub: "Just getting started", emoji: "🌱" },
  { id: "some", label: "3–5", sub: "Building momentum", emoji: "💪" },
  { id: "lots", label: "6+", sub: "Already on fire", emoji: "🔥" },
] as const;

const SOURCE_OPTIONS = [
  { id: "tiktok", label: "TikTok" },
  { id: "instagram", label: "Instagram" },
  { id: "youtube", label: "YouTube" },
  { id: "x", label: "X" },
  { id: "facebook", label: "Facebook" },
  { id: "google", label: "Google" },
  { id: "friend", label: "Friend" },
  { id: "other", label: "Other" },
] as const;

function SourceLogo({ id, selected }: { id: string; selected: boolean }) {
  // Keep logo brand colors unless selected (selected state goes white for contrast).
  const tint = selected ? "#ffffff" : undefined;
  switch (id) {
    case "tiktok":
      return (
        <svg width="26" height="26" viewBox="0 0 24 24" fill={tint || "#000"}>
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.1z" />
        </svg>
      );
    case "instagram":
      if (selected) {
        return (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
          </svg>
        );
      }
      return (
        <svg width="26" height="26" viewBox="0 0 24 24">
          <defs>
            <radialGradient id="ig-grad" cx="30%" cy="107%" r="150%">
              <stop offset="0%" stopColor="#FFDD55" />
              <stop offset="10%" stopColor="#FFDD55" />
              <stop offset="50%" stopColor="#FF543E" />
              <stop offset="100%" stopColor="#C837AB" />
            </radialGradient>
            <linearGradient id="ig-grad-blue" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3771C8" stopOpacity="1" />
              <stop offset="50%" stopColor="#3771C8" stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#ig-grad)" />
          <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#ig-grad-blue)" />
          <rect x="5.25" y="5.25" width="13.5" height="13.5" rx="3.75" fill="none" stroke="#fff" strokeWidth="1.7" />
          <circle cx="12" cy="12" r="3.2" fill="none" stroke="#fff" strokeWidth="1.7" />
          <circle cx="16.2" cy="7.8" r="0.9" fill="#fff" />
        </svg>
      );
    case "youtube":
      return (
        <svg width="28" height="20" viewBox="0 0 28 20" fill={tint || "#FF0000"}>
          <path d="M27.44 3.12a3.5 3.5 0 0 0-2.46-2.48C22.84 0 14 0 14 0S5.16 0 3.02.64A3.5 3.5 0 0 0 .56 3.12 36.2 36.2 0 0 0 0 10a36.2 36.2 0 0 0 .56 6.88 3.5 3.5 0 0 0 2.46 2.48C5.16 20 14 20 14 20s8.84 0 10.98-.64a3.5 3.5 0 0 0 2.46-2.48A36.2 36.2 0 0 0 28 10a36.2 36.2 0 0 0-.56-6.88z" />
          <path d="M11.2 14.29L18.55 10 11.2 5.71z" fill={selected ? "#1a1a1a" : "#fff"} />
        </svg>
      );
    case "x":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={tint || "#000"}>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case "facebook":
      return (
        <svg width="26" height="26" viewBox="0 0 24 24" fill={tint || "#1877F2"}>
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      );
    case "google":
      if (selected) {
        return (
          <svg width="24" height="24" viewBox="0 0 48 48" fill="#fff">
            <path d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84a10.1 10.1 0 0 1-4.38 6.64v5.52h7.1c4.16-3.83 6.56-9.47 6.56-16.17zM24 46c5.94 0 10.92-1.97 14.56-5.33l-7.1-5.52a13.5 13.5 0 0 1-7.46 2.08c-5.74 0-10.6-3.88-12.33-9.08H4.34v5.7A22 22 0 0 0 24 46zm-12.33-18.15a13.2 13.2 0 0 1 0-8.44v-5.7H4.34a22 22 0 0 0 0 19.84l7.33-5.7zM24 10.75c3.23 0 6.13 1.11 8.42 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2a22 22 0 0 0-19.66 12.21l7.33 5.7C13.4 14.62 18.26 10.75 24 10.75z" />
          </svg>
        );
      }
      return (
        <svg width="24" height="24" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
      );
    case "friend":
      return (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={tint || "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "other":
    default:
      return (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={tint || "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
  }
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingInner />
    </Suspense>
  );
}

function OnboardingInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const [liveError, setLiveError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("welcome");
  const [approaches, setApproaches] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [experience, setExperience] = useState<string | null>(null);
  const [birthMonth, setBirthMonth] = useState<number | null>(null);
  const [birthDay, setBirthDay] = useState<number | null>(null);
  const [birthYear, setBirthYear] = useState<number | null>(null);
  const [goals, setGoals] = useState<string[]>([]);
  const [weeklyTarget, setWeeklyTarget] = useState<number>(5);
  const error = liveError || searchParams.get("error");

  const toggleGoal = (id: string) => {
    setGoals((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  };

  useEffect(() => {
    setupAuthDeepLinkListener();
    initSocialLogin();
    hideSplash();
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [router, status]);

  const handleGoogle = async () => {
    setLiveError(null);
    const r = await signInWithGoogle();
    if (r.error) setLiveError(r.error);
  };

  const handleApple = async () => {
    setLiveError(null);
    const r = await signInWithApple();
    if (r.error) setLiveError(r.error);
  };

  if (step === "welcome") {
    return (
      <main className="h-app max-w-md mx-auto flex flex-col px-6 pt-10 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <PhoneMockup />

        <h1 className="my-auto font-display text-[34px] font-extrabold tracking-tight leading-[1.05] text-center">
          Talk to more women
        </h1>

        <div className="space-y-4 shrink-0">
          <button
            onClick={() => setStep("approaches")}
            className="w-full bg-[#1a1a1a] text-white py-4 rounded-2xl font-semibold text-[16px] press"
          >
            Get started
          </button>
          <p className="text-center text-[14px] text-text-muted">
            Already have an account?{" "}
            <button onClick={() => setStep("auth")} className="text-text font-semibold underline press">
              Sign in
            </button>
          </p>
        </div>
      </main>
    );
  }

  if (step === "approaches") {
    return (
      <main className="h-app max-w-md mx-auto flex flex-col px-6 pt-10 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <QuizHeader onBack={() => setStep("welcome")} progress={0.2} />

        <div className="mt-8">
          <h1 className="font-display text-[28px] font-bold tracking-tight leading-[1.15]">
            How many girls do you talk to per week?
          </h1>
          <p className="text-text-muted text-[15px] leading-relaxed mt-2">
            Be honest — we&apos;ll use this to build your plan.
          </p>
        </div>

        <div className="mt-8 space-y-3">
          {APPROACH_OPTIONS.map((opt) => {
            const selected = approaches === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setApproaches(opt.id)}
                className={`w-full flex items-center gap-4 text-left px-5 py-4 rounded-2xl border-2 transition-colors press ${
                  selected
                    ? "border-[#1a1a1a] bg-[#1a1a1a] text-white"
                    : "border-border bg-bg-card"
                }`}
              >
                <span className="text-[30px] leading-none shrink-0" aria-hidden>
                  {opt.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[18px] font-semibold leading-tight tabular-nums">
                    {opt.label}
                  </p>
                  <p className={`text-[13px] font-medium mt-0.5 ${selected ? "text-white/60" : "text-text-muted"}`}>
                    {opt.sub}
                  </p>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                    selected ? "border-white bg-white" : "border-border"
                  }`}
                >
                  {selected && (
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="#1a1a1a" strokeWidth="3">
                      <path d="M3 8l3 3 7-7" />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setStep("source")}
          disabled={!approaches}
          className="mt-auto w-full bg-[#1a1a1a] text-white py-4 rounded-2xl font-semibold text-[16px] press disabled:opacity-30 disabled:pointer-events-none"
        >
          Next
        </button>
      </main>
    );
  }

  if (step === "source") {
    return (
      <main className="h-app max-w-md mx-auto flex flex-col px-6 pt-10 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <QuizHeader onBack={() => setStep("approaches")} progress={0.4} />

        <div className="mt-8">
          <h1 className="font-display text-[28px] font-bold tracking-tight leading-[1.15]">
            Where did you hear about us?
          </h1>
        </div>

        <div className="mt-8 space-y-3">
          {SOURCE_OPTIONS.map((opt) => {
            const selected = source === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setSource(opt.id)}
                className={`w-full flex items-center gap-4 text-left px-5 py-3.5 rounded-2xl border-2 transition-colors press ${
                  selected
                    ? "border-[#1a1a1a] bg-[#1a1a1a] text-white"
                    : "border-border bg-bg-card"
                }`}
              >
                <span className="w-7 h-7 flex items-center justify-center shrink-0" aria-hidden>
                  <SourceLogo id={opt.id} selected={selected} />
                </span>
                <p className="text-[16px] font-semibold leading-tight flex-1">{opt.label}</p>
                <div
                  className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                    selected ? "border-white bg-white" : "border-border"
                  }`}
                >
                  {selected && (
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="#1a1a1a" strokeWidth="3">
                      <path d="M3 8l3 3 7-7" />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setStep("experience")}
          disabled={!source}
          className="mt-auto w-full bg-[#1a1a1a] text-white py-4 rounded-2xl font-semibold text-[16px] press disabled:opacity-30 disabled:pointer-events-none"
        >
          Next
        </button>
      </main>
    );
  }

  if (step === "experience") {
    return (
      <main className="h-app max-w-md mx-auto flex flex-col px-6 pt-10 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <QuizHeader onBack={() => setStep("source")} progress={0.6} />

        <div className="mt-8">
          <h1 className="font-display text-[28px] font-bold tracking-tight leading-[1.15]">
            Have you tried other confidence apps?
          </h1>
        </div>

        <div className="flex-1 flex items-center">
          <div className="w-full space-y-3">
            {EXPERIENCE_OPTIONS.map((opt) => {
              const selected = experience === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setExperience(opt.id)}
                  className={`w-full flex items-center gap-4 text-left px-5 py-4 rounded-2xl border-2 transition-colors press ${
                    selected
                      ? "border-[#1a1a1a] bg-[#1a1a1a] text-white"
                      : "border-border bg-bg-card"
                  }`}
                >
                  <span className="text-[30px] leading-none shrink-0" aria-hidden>
                    {opt.emoji}
                  </span>
                  <p className="text-[18px] font-semibold leading-tight flex-1">{opt.label}</p>
                  <div
                    className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                      selected ? "border-white bg-white" : "border-border"
                    }`}
                  >
                    {selected && (
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="#1a1a1a" strokeWidth="3">
                        <path d="M3 8l3 3 7-7" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => setStep("pitch")}
          disabled={!experience}
          className="mt-auto w-full bg-[#1a1a1a] text-white py-4 rounded-2xl font-semibold text-[16px] press disabled:opacity-30 disabled:pointer-events-none"
        >
          Next
        </button>
      </main>
    );
  }

  if (step === "pitch") {
    return (
      <main className="h-app max-w-md mx-auto flex flex-col px-6 pt-10 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <QuizHeader onBack={() => setStep("experience")} progress={0.8} />

        <div className="mt-8">
          <h1 className="font-display text-[30px] font-bold tracking-tight leading-[1.1]">
            Wingmate helps you talk to more girls.
          </h1>
          <p className="text-text-muted text-[15px] leading-relaxed mt-3">
            Here&apos;s what the first month looks like.
          </p>
        </div>

        <div className="flex-1 flex items-center justify-center py-8">
          <GrowthChart />
        </div>

        <button
          onClick={() => setStep("birthday")}
          className="w-full bg-[#1a1a1a] text-white py-4 rounded-2xl font-semibold text-[16px] press"
        >
          Continue
        </button>
      </main>
    );
  }

  if (step === "birthday") {
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 90 }, (_, i) => currentYear - 13 - i); // 13 and older
    const maxDay = birthMonth !== null && birthYear !== null ? daysInMonth(birthMonth, birthYear) : 31;
    const days = Array.from({ length: maxDay }, (_, i) => i + 1);
    const complete = birthMonth !== null && birthDay !== null && birthYear !== null;

    return (
      <main className="h-app max-w-md mx-auto flex flex-col px-6 pt-10 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <QuizHeader onBack={() => setStep("pitch")} progress={0.9} />

        <div className="mt-8">
          <h1 className="font-display text-[28px] font-bold tracking-tight leading-[1.15]">
            When were you born?
          </h1>
          <p className="text-text-muted text-[15px] leading-relaxed mt-2">
            You must be 18 or older to use Wingmate.
          </p>
        </div>

        <div className="flex-1 flex items-center">
          <div className="w-full relative" style={{ height: 200 }}>
            {/* Selection highlight band across all three wheels */}
            <div
              className="absolute left-0 right-0 top-1/2 -translate-y-1/2 rounded-xl border-y border-border bg-bg-card/40 pointer-events-none"
              style={{ height: 40 }}
            />
            <div className="relative grid grid-cols-3 gap-3 h-full">
              <WheelPicker
                value={birthMonth}
                onChange={(v) => {
                  setBirthMonth(v);
                  if (birthDay !== null) {
                    const max = daysInMonth(v, birthYear ?? currentYear);
                    if (birthDay > max) setBirthDay(max);
                  }
                }}
                options={MONTHS.map((name, i) => ({ value: i, label: name.slice(0, 3) }))}
              />
              <WheelPicker
                value={birthDay}
                onChange={setBirthDay}
                options={days.map((d) => ({ value: d, label: String(d) }))}
              />
              <WheelPicker
                value={birthYear}
                onChange={(v) => {
                  setBirthYear(v);
                  if (birthMonth !== null && birthDay !== null) {
                    const max = daysInMonth(birthMonth, v);
                    if (birthDay > max) setBirthDay(max);
                  }
                }}
                options={years.map((y) => ({ value: y, label: String(y) }))}
              />
            </div>
          </div>
        </div>

        <button
          onClick={() => setStep("goal")}
          disabled={!complete}
          className="w-full bg-[#1a1a1a] text-white py-4 rounded-2xl font-semibold text-[16px] press disabled:opacity-30 disabled:pointer-events-none"
        >
          Next
        </button>
      </main>
    );
  }

  if (step === "goal") {
    return (
      <main className="h-app max-w-md mx-auto flex flex-col px-6 pt-10 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <QuizHeader onBack={() => setStep("birthday")} progress={0.95} />

        <div className="mt-8">
          <h1 className="font-display text-[28px] font-bold tracking-tight leading-[1.15]">
            What is your goal?
          </h1>
          <p className="text-text-muted text-[15px] leading-relaxed mt-2">
            Pick any that apply.
          </p>
        </div>

        <div className="flex-1 flex items-center">
          <div className="w-full space-y-3">
            {GOAL_OPTIONS.map((opt) => {
              const selected = goals.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  onClick={() => toggleGoal(opt.id)}
                  className={`w-full flex items-center gap-4 text-left px-5 py-4 rounded-2xl border-2 transition-colors press ${
                    selected
                      ? "border-[#1a1a1a] bg-[#1a1a1a] text-white"
                      : "border-border bg-bg-card"
                  }`}
                >
                  <span className="text-[28px] leading-none shrink-0" aria-hidden>
                    {opt.emoji}
                  </span>
                  <p className="text-[17px] font-semibold leading-tight flex-1">{opt.label}</p>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => setStep("target")}
          disabled={goals.length === 0}
          className="w-full bg-[#1a1a1a] text-white py-4 rounded-2xl font-semibold text-[16px] press disabled:opacity-30 disabled:pointer-events-none"
        >
          Next
        </button>
      </main>
    );
  }

  if (step === "target") {
    return (
      <main className="h-app max-w-md mx-auto flex flex-col px-6 pt-10 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <QuizHeader onBack={() => setStep("goal")} progress={0.97} />

        <div className="mt-8">
          <h1 className="font-display text-[28px] font-bold tracking-tight leading-[1.15]">
            How many girls do you want to talk to per week?
          </h1>
          <p className="text-text-muted text-[15px] leading-relaxed mt-2">
            Don&apos;t worry — you can change this later.
          </p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-10 w-full">
          <div className="text-center">
            <span className="font-display text-[80px] font-extrabold leading-none tabular-nums">
              {weeklyTarget}
            </span>
            <span className="block text-[14px] text-text-muted font-medium mt-2">
              {weeklyTarget === 1 ? "girl / week" : "girls / week"}
            </span>
          </div>

          <div className="w-full px-3">
            <div className="relative h-12 flex items-center">
              {/* Thin track */}
              <div className="absolute left-0 right-0 h-1 bg-bg-input rounded-full" />
              {/* Filled portion */}
              <div
                className="absolute left-0 h-1 bg-[#1a1a1a] rounded-full transition-[width] duration-75"
                style={{
                  width: `${((weeklyTarget - TARGET_MIN) / (TARGET_MAX - TARGET_MIN)) * 100}%`,
                }}
              />
              {/* Clean circular thumb */}
              <div
                className="absolute top-1/2 -translate-y-1/2 pointer-events-none transition-transform"
                style={{
                  left: `calc(${((weeklyTarget - TARGET_MIN) / (TARGET_MAX - TARGET_MIN)) * 100}% - 14px)`,
                }}
              >
                <div className="w-7 h-7 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.12),0_0_0_0.5px_rgba(0,0,0,0.08)]" />
              </div>
              {/* Large invisible hit area */}
              <input
                type="range"
                min={TARGET_MIN}
                max={TARGET_MAX}
                step={1}
                value={weeklyTarget}
                onChange={(e) => setWeeklyTarget(Number(e.target.value))}
                className="wing-range absolute inset-0 w-full opacity-0 z-10"
              />
            </div>
            <div className="flex justify-between mt-3 text-[11px] font-medium text-text-muted">
              <span>{TARGET_MIN}</span>
              <span>{TARGET_MAX}+</span>
            </div>
          </div>
        </div>

        <style jsx global>{`
          .wing-range {
            -webkit-appearance: none;
            appearance: none;
            height: 48px;
            outline: none;
            cursor: grab;
          }
          .wing-range:active { cursor: grabbing; }
          .wing-range::-webkit-slider-runnable-track { background: transparent; height: 48px; }
          .wing-range::-moz-range-track { background: transparent; height: 48px; }
          .wing-range::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 48px;
            height: 48px;
            background: transparent;
          }
          .wing-range::-moz-range-thumb {
            width: 48px;
            height: 48px;
            background: transparent;
            border: 0;
          }
        `}</style>

        <button
          onClick={() => setStep("doable")}
          className="w-full bg-[#1a1a1a] text-white py-4 rounded-2xl font-semibold text-[16px] press"
        >
          Next
        </button>
      </main>
    );
  }

  if (step === "doable") {
    return (
      <main className="h-app max-w-md mx-auto flex flex-col px-6 pt-10 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <QuizHeader onBack={() => setStep("target")} progress={0.99} />

        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mb-8">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12l5 5L20 6" />
            </svg>
          </div>

          <h1 className="font-display text-[32px] font-extrabold tracking-tight leading-[1.1] mb-4">
            <span className="text-green-500">
              {weeklyTarget} {weeklyTarget === 1 ? "girl" : "girls"}
            </span>{" "}
            a week is totally doable.
          </h1>
          <p className="text-text-muted text-[15px] leading-relaxed max-w-[320px]">
            That&apos;s just {weeklyTarget === 1 ? "one approach" : Math.ceil(weeklyTarget / 7) + " or so a day"}. With Wingmate in your pocket, you&apos;ve got this.
          </p>
        </div>

        <button
          onClick={() => setStep("thanks")}
          className="w-full bg-[#1a1a1a] text-white py-4 rounded-2xl font-semibold text-[16px] press"
        >
          Let&apos;s go
        </button>
      </main>
    );
  }

  if (step === "thanks") {
    return (
      <main className="h-app max-w-md mx-auto flex flex-col px-6 pt-10 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <QuizHeader onBack={() => setStep("doable")} progress={1} />

        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mb-8">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" strokeWidth="1.8" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>

          <h1 className="font-display text-[32px] font-extrabold tracking-tight leading-[1.1] mb-4">
            Thank you for trusting us.
          </h1>
          <p className="text-text-muted text-[15px] leading-relaxed max-w-[320px]">
            We&apos;ll help you build the confidence to go after what you actually want. No judgment, just backup.
          </p>
        </div>

        <button
          onClick={() => setStep("notifications")}
          className="w-full bg-[#1a1a1a] text-white py-4 rounded-2xl font-semibold text-[16px] press"
        >
          Continue
        </button>
      </main>
    );
  }

  if (step === "notifications") {
    const requestNotifications = async () => {
      try {
        if (typeof window !== "undefined" && "Notification" in window) {
          await Notification.requestPermission();
        }
      } catch {}
      setStep("auth");
    };

    return (
      <main className="h-app max-w-md mx-auto flex flex-col px-6 pt-10 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <QuizHeader onBack={() => setStep("thanks")} progress={1} />

        <div className="mt-8">
          <h1 className="font-display text-[30px] font-bold tracking-tight leading-[1.15]">
            Reach your goals with notifications.
          </h1>
          <p className="text-text-muted text-[15px] leading-relaxed mt-2">
            A nudge at the right moment is the difference between doing it and not.
          </p>
        </div>

        <div className="flex-1 flex items-center justify-center py-8">
          <div className="w-full max-w-[340px] space-y-2.5">
            <NotifPreview
              title="Wingmate"
              body="Time to make today count 🔥 Who are you going to talk to?"
              timestamp="now"
            />
            <NotifPreview
              title="Wingmate"
              body="You're 2 approaches away from hitting your weekly goal. Let's finish it."
              timestamp="2m ago"
              dim
            />
            <NotifPreview
              title="Wingmate"
              body="3-day streak 🔥 Don't break it — check in before midnight."
              timestamp="1h ago"
              dim
            />
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={requestNotifications}
            className="w-full bg-[#1a1a1a] text-white py-4 rounded-2xl font-semibold text-[16px] press"
          >
            Allow notifications
          </button>
          <button
            onClick={() => setStep("auth")}
            className="w-full text-center text-text-muted text-[14px] font-medium press py-2"
          >
            Maybe later
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="h-app max-w-md mx-auto flex flex-col justify-between px-7 pt-16 pb-[calc(3rem+env(safe-area-inset-bottom))]">
      <div>
        <button
          onClick={() => setStep("notifications")}
          className="text-text-muted text-[14px] font-medium mb-8 press"
        >
          ← Back
        </button>
        <h1 className="font-display text-[28px] font-bold tracking-tight leading-[1.2] mb-3">
          Create your account
        </h1>
        <p className="text-text-muted text-[15px] leading-[1.65]">
          Save your progress and pick up on any device.
        </p>
      </div>

      <div className="space-y-3">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-2">
            <p className="text-[14px] font-medium text-red-700 break-words text-left whitespace-pre-wrap">
              {error}
            </p>
          </div>
        )}
        <button
          onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 bg-white border border-border py-3.5 rounded-2xl font-semibold text-[15px] press shadow-sm"
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continue with Google
        </button>

        <button
          onClick={handleApple}
          className="w-full flex items-center justify-center gap-3 bg-[#1a1a1a] text-white border border-[#1a1a1a] py-3.5 rounded-2xl font-semibold text-[15px] press"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.32-2.11 4.45-3.74 4.25z"/>
          </svg>
          Continue with Apple
        </button>

        <p className="text-center text-[12px] text-text-muted pt-2">
          By signing in, you confirm you are at least 18 years old and agree to our{" "}
          <a href="/terms" className="underline">Terms of Service</a> and{" "}
          <a href="/privacy" className="underline">Privacy Policy</a>.
        </p>
      </div>
    </main>
  );
}

function NotifPreview({
  title,
  body,
  timestamp,
  dim,
}: {
  title: string;
  body: string;
  timestamp: string;
  dim?: boolean;
}) {
  return (
    <div
      className={`bg-bg-card/95 backdrop-blur rounded-2xl px-3.5 py-3 flex items-start gap-3 shadow-[0_4px_14px_rgba(0,0,0,0.06)] border border-border/60 transition-opacity ${
        dim ? "opacity-60" : ""
      }`}
    >
      <div className="w-9 h-9 rounded-[9px] bg-[#1a1a1a] flex items-center justify-center shrink-0">
        <span className="text-white text-[13px] font-bold">W</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[12px] font-semibold leading-none">{title}</p>
          <span className="text-[10px] text-text-muted leading-none shrink-0">{timestamp}</span>
        </div>
        <p className="text-[12.5px] leading-snug mt-1 text-text/90 line-clamp-2">{body}</p>
      </div>
    </div>
  );
}

function RulerPicker({
  min,
  max,
  value,
  onChange,
}: {
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const TICK_W = 18;
  const count = max - min + 1;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Position on initial value without firing onChange
    const idx = value - min;
    el.scrollLeft = idx * TICK_W;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const idx = Math.round(el.scrollLeft / TICK_W);
      const clamped = Math.max(0, Math.min(count - 1, idx));
      const v = min + clamped;
      if (v !== value) onChange(v);
    });
  };

  return (
    <div className="w-full relative" style={{ height: 80 }}>
      {/* Center indicator: a tall vertical line above the ticks + small triangle */}
      <div
        className="absolute left-1/2 -translate-x-1/2 top-0 pointer-events-none"
        style={{ zIndex: 5 }}
      >
        <svg width="12" height="6" viewBox="0 0 12 6">
          <path d="M0 0 L12 0 L6 6 Z" fill="#1a1a1a" />
        </svg>
      </div>
      <div
        className="absolute left-1/2 -translate-x-1/2 w-[2px] bg-[#1a1a1a] pointer-events-none rounded-full"
        style={{ top: 6, height: 48, zIndex: 5 }}
      />

      {/* Scrollable ticks */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="absolute inset-0 overflow-x-scroll"
        style={{
          scrollSnapType: "x mandatory",
          scrollbarWidth: "none",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)",
          maskImage:
            "linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)",
        }}
      >
        <style jsx>{`
          div::-webkit-scrollbar { display: none; }
        `}</style>
        <div
          className="flex items-end"
          style={{
            height: "100%",
            paddingLeft: "calc(50% - 1px)",
            paddingRight: "calc(50% - 1px)",
          }}
        >
          {Array.from({ length: count }).map((_, i) => {
            const n = min + i;
            const isMajor = n % 5 === 0;
            const isCurrent = n === value;
            return (
              <div
                key={n}
                className="relative flex flex-col items-center justify-end"
                style={{
                  width: TICK_W,
                  height: "100%",
                  scrollSnapAlign: "center",
                  scrollSnapStop: "always",
                }}
              >
                <span
                  className={`absolute tabular-nums transition-all ${
                    isCurrent ? "text-[13px] font-bold text-text" : "text-[11px] font-medium text-text-muted"
                  }`}
                  style={{ top: 12, opacity: isMajor || isCurrent ? 1 : 0 }}
                >
                  {n}
                </span>
                <div
                  className="bg-text-muted/60"
                  style={{
                    width: 2,
                    height: isMajor ? 22 : 14,
                    borderRadius: 1,
                    marginBottom: 2,
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function WheelPicker({
  value,
  onChange,
  options,
}: {
  value: number | null;
  onChange: (v: number) => void;
  options: { value: number; label: string }[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const ITEM_HEIGHT = 40;
  const VISIBLE = 5; // 2 above, centered, 2 below
  const PAD = ((VISIBLE - 1) / 2) * ITEM_HEIGHT;

  // Scroll to the initially-selected option on mount (or clear).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = value === null ? 0 : options.findIndex((o) => o.value === value);
    el.scrollTop = Math.max(0, idx) * ITEM_HEIGHT;
    // Fire the initial value so default selection registers.
    if (value === null && options[0]) onChange(options[0].value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const idx = Math.round(el.scrollTop / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(options.length - 1, idx));
      const opt = options[clamped];
      if (opt && opt.value !== value) onChange(opt.value);
    });
  };

  const selectedIdx = value === null ? -1 : options.findIndex((o) => o.value === value);

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="h-full overflow-y-scroll touch-pan-y"
      style={{
        scrollSnapType: "y mandatory",
        scrollbarWidth: "none",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent 0%, black 30%, black 70%, transparent 100%)",
        maskImage:
          "linear-gradient(to bottom, transparent 0%, black 30%, black 70%, transparent 100%)",
      }}
    >
      <style jsx>{`
        div::-webkit-scrollbar { display: none; }
      `}</style>
      <div style={{ height: PAD }} />
      {options.map((opt, i) => {
        const distance = Math.abs(i - selectedIdx);
        const isCenter = i === selectedIdx;
        return (
          <div
            key={opt.value}
            className="flex items-center justify-center tabular-nums transition-all duration-150"
            style={{
              height: ITEM_HEIGHT,
              scrollSnapAlign: "center",
              scrollSnapStop: "always",
              fontSize: isCenter ? 20 : 17,
              fontWeight: isCenter ? 700 : 500,
              opacity: distance === 0 ? 1 : distance === 1 ? 0.5 : 0.25,
            }}
          >
            {opt.label}
          </div>
        );
      })}
      <div style={{ height: PAD }} />
    </div>
  );
}

function GrowthChart() {
  return (
    <div className="w-full bg-bg-card border border-border rounded-2xl shadow-card p-5">
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">Approaches / week</p>
          <p className="font-display text-[24px] font-extrabold leading-tight mt-1">Up and to the right</p>
        </div>
      </div>

      <svg viewBox="0 0 300 160" className="w-full" preserveAspectRatio="none" style={{ height: "140px" }}>
        {/* horizontal gridlines */}
        {[0, 1, 2, 3].map((i) => (
          <line
            key={i}
            x1="0"
            x2="300"
            y1={20 + i * 35}
            y2={20 + i * 35}
            stroke="#efefef"
            strokeWidth="1"
          />
        ))}

        {/* without-app baseline (flat) */}
        <path d="M 0 130 L 300 128" stroke="#d4d4d8" strokeWidth="3" fill="none" strokeLinecap="round" />

        {/* with-Wingmate curve */}
        <path
          d="M 0 130 Q 80 120 120 95 T 220 45 T 300 15"
          stroke="#1a1a1a"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />

        {/* end cap dot */}
        <circle cx="300" cy="15" r="5" fill="#1a1a1a" />
      </svg>

      <div className="flex items-center justify-between mt-4 text-[11px] text-text-muted">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded-full bg-[#d4d4d8]" />
          <span>Without app</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded-full bg-[#1a1a1a]" />
          <span className="font-semibold text-text">With Wingmate</span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <span className="text-[11px] font-medium text-text-muted">Week 1</span>
        <span className="text-[11px] font-medium text-text-muted">Week 4</span>
      </div>
    </div>
  );
}

function QuizHeader({ onBack, progress }: { onBack: () => void; progress: number }) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={onBack} className="p-1 -ml-1 press shrink-0" aria-label="Back">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <div className="flex-1 h-1.5 bg-bg-input rounded-full overflow-hidden">
        <div
          className="h-full bg-[#1a1a1a] rounded-full transition-all duration-300"
          style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }}
        />
      </div>
    </div>
  );
}

function PhoneMockup() {
  return (
    <div
      className="mx-auto relative select-none pointer-events-none"
      style={{ width: "min(220px, 62vw)" }}
    >
      {/* Side buttons (subtle protrusion hints) */}
      <div className="absolute left-[-2px] top-[90px] w-[2px] h-[28px] bg-[#0a0a0a] rounded-l-sm" />
      <div className="absolute left-[-2px] top-[140px] w-[2px] h-[48px] bg-[#0a0a0a] rounded-l-sm" />
      <div className="absolute left-[-2px] top-[200px] w-[2px] h-[48px] bg-[#0a0a0a] rounded-l-sm" />
      <div className="absolute right-[-2px] top-[160px] w-[2px] h-[80px] bg-[#0a0a0a] rounded-r-sm" />

      {/* Phone frame — titanium look via gradient, rounded corners close to iPhone 15 Pro */}
      <div
        className="rounded-[44px] p-[3px]"
        style={{
          background:
            "linear-gradient(145deg, #3a3a3a 0%, #1a1a1a 40%, #0a0a0a 100%)",
          boxShadow:
            "0 30px 80px -20px rgba(0,0,0,0.5), 0 12px 24px -10px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.05)",
        }}
      >
        <div
          className="rounded-[41px] p-[6px]"
          style={{ background: "#000" }}
        >
          <div
            className="relative overflow-hidden rounded-[36px] bg-bg"
            style={{ aspectRatio: "9/19.5" }}
          >
            {/* Dynamic Island */}
            <div
              className="absolute left-1/2 -translate-x-1/2 bg-black rounded-full z-30"
              style={{ top: "8px", width: "34%", height: "22px" }}
            />

            {/* Status bar */}
            <div
              className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5"
              style={{ height: "38px" }}
            >
              <span className="text-[11px] font-semibold tabular-nums">9:41</span>
              <div className="flex items-center gap-[4px] text-text">
                {/* signal */}
                <svg width="14" height="10" viewBox="0 0 18 12" fill="currentColor">
                  <rect x="0" y="8" width="3" height="4" rx="0.5" />
                  <rect x="5" y="5" width="3" height="7" rx="0.5" />
                  <rect x="10" y="2" width="3" height="10" rx="0.5" />
                  <rect x="15" y="0" width="3" height="12" rx="0.5" />
                </svg>
                {/* wifi */}
                <svg width="14" height="10" viewBox="0 0 16 12" fill="currentColor">
                  <path d="M8 11.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM3.5 7.5a6 6 0 019 0L11 9a4 4 0 00-6 0L3.5 7.5zM.5 4.5a10 10 0 0115 0L14 6a8 8 0 00-12 0L.5 4.5z" />
                </svg>
                {/* battery */}
                <div className="relative">
                  <div
                    className="border border-current/50 rounded-[3px] flex items-center"
                    style={{ width: "22px", height: "11px", padding: "1px" }}
                  >
                    <div
                      className="bg-current rounded-[1px]"
                      style={{ width: "80%", height: "100%" }}
                    />
                  </div>
                  <div
                    className="absolute bg-current/50 rounded-r-[1px]"
                    style={{ right: "-2px", top: "3px", width: "1.5px", height: "5px" }}
                  />
                </div>
              </div>
            </div>

            {/* Chat header */}
            <div
              className="absolute left-0 right-0 border-b border-border/60 flex items-center gap-2.5 px-4 bg-bg/80 backdrop-blur"
              style={{ top: "38px", height: "40px", zIndex: 15 }}
            >
              <div className="w-7 h-7 rounded-full bg-[#1a1a1a] flex items-center justify-center shrink-0">
                <span className="text-white text-[11px] font-bold">W</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold leading-tight truncate">Wingmate</p>
                <p className="text-[9px] text-text-muted leading-tight">AI coach · online</p>
              </div>
            </div>

            {/* Messages */}
            <div
              className="absolute left-0 right-0 px-3 space-y-1.5 overflow-hidden"
              style={{ top: "82px", bottom: "48px" }}
            >
              <MessageBubble from="user">
                She&apos;s right across from me at the coffee shop. What do I say??
              </MessageBubble>
              <MessageBubble from="ai">Go NOW bro. 10 seconds of courage.</MessageBubble>
              <MessageBubble from="ai">
                Walk over. Eye contact. &ldquo;Hey, I know this is random but you caught my eye.&rdquo;
              </MessageBubble>
              <MessageBubble from="user">It worked. Got her number 🔥</MessageBubble>
              <MessageBubble from="ai">LET&apos;S GOOOO KING 👑</MessageBubble>
            </div>

            {/* Input bar */}
            <div
              className="absolute left-2 right-2 bg-bg-card border border-border rounded-full px-3 py-1.5 flex items-center gap-2 shadow-sm"
              style={{ bottom: "18px" }}
            >
              <div className="flex-1 text-[10px] text-text-muted/60 truncate">
                What&apos;s on your mind...
              </div>
              <div className="w-5 h-5 rounded-full bg-[#1a1a1a] flex items-center justify-center shrink-0">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </div>
            </div>

            {/* Home indicator */}
            <div
              className="absolute left-1/2 -translate-x-1/2 bg-[#1a1a1a] rounded-full"
              style={{ bottom: "6px", width: "36%", height: "4px" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ from, children }: { from: "user" | "ai"; children: React.ReactNode }) {
  const isUser = from === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] px-2.5 py-1.5 text-[10px] leading-snug ${
          isUser
            ? "bg-[#1a1a1a] text-white rounded-[14px] rounded-br-[4px]"
            : "bg-bg-input text-text rounded-[14px] rounded-bl-[4px]"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
