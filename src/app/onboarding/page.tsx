"use client";

import { useEffect, useLayoutEffect, Suspense, useState, useRef, Fragment } from "react";
import { Check, MessageCircle, Target, Flame, Users } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithGoogle, signInWithApple, signInAsReviewer } from "@/lib/auth-client";
import { useSession } from "next-auth/react";
import { hideSplash, setupAuthDeepLinkListener, initSocialLogin } from "@/lib/capacitor";
import { isApplePlatform, isNativePlatform } from "@/lib/platform";
import { initPurchases, getOfferings, purchasePackage, identifyUser } from "@/lib/purchases";

type Step =
  | "welcome"
  | "status"
  | "approaches"
  | "source"
  | "experience"
  | "pitch"
  | "location"
  | "birthday"
  | "goal"
  | "target"
  | "doable"
  | "blockers"
  | "thanks"
  | "notifications"
  | "rating"
  | "referral"
  | "planIntro"
  | "planGenerating"
  | "planReady"
  | "auth"
  | "trialIntro"
  | "trialReminder"
  | "trialPayment";

const TARGET_MIN = 1;
const TARGET_MAX = 10;
const TARGET_THUMB = 28;

// Ordered list of every step that renders a progress bar. Used to drive an
// even, monotonic progress value so each Next press advances the bar by the
// same amount instead of jumping unevenly.
const PROGRESS_STEPS = [
  "status", "approaches", "source", "experience", "pitch",
  "location", "birthday", "goal", "target", "doable",
  "blockers", "thanks", "notifications", "rating", "referral",
  "planIntro", "planReady", "auth",
] as const;

// Full forward ordering including non-progress steps. Used to infer whether
// a setStep() call is a forward advance or a backward navigation so the
// page can play the right slide-in direction.
const ALL_STEPS = [
  "welcome", "status", "approaches", "source", "experience", "pitch",
  "location", "birthday", "goal", "target", "doable", "blockers",
  "thanks", "notifications", "rating", "referral", "planIntro", "planGenerating",
  "planReady", "auth", "trialIntro", "trialReminder", "trialPayment",
] as const;

function progressFor(step: string): number {
  const idx = (PROGRESS_STEPS as readonly string[]).indexOf(step);
  return idx < 0 ? 0 : (idx + 1) / PROGRESS_STEPS.length;
}

const GOAL_OPTIONS = [
  { id: "girlfriend", label: "Get a girlfriend", emoji: "💖" },
  { id: "rizz", label: "Improve my rizz", emoji: "🎯" },
  { id: "memories", label: "Make fun memories", emoji: "🎉" },
] as const;

const LOCATION_OPTIONS = [
  { id: "city", label: "Big city", sub: "Dense, lots of people around", emoji: "🏙️" },
  { id: "suburb", label: "Suburbs", sub: "Quieter neighborhoods near a city", emoji: "🏡" },
  { id: "town", label: "Small town", sub: "A few thousand people", emoji: "🏘️" },
  { id: "rural", label: "Rural", sub: "Lots of space, few people", emoji: "🌾" },
] as const;

const STATUS_OPTIONS = [
  { id: "student", label: "Student", emoji: "🎓" },
  { id: "working", label: "In the workforce", emoji: "💼" },
  { id: "other", label: "Other", emoji: "🌟" },
] as const;

const BLOCKER_OPTIONS = [
  { id: "rejection", label: "Fear of rejection", emoji: "😰" },
  { id: "words", label: "Don't know what to say", emoji: "🤐" },
  { id: "confidence", label: "Low confidence", emoji: "😔" },
  { id: "time", label: "Never the right moment", emoji: "⏰" },
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
  const { data: session, status } = useSession();
  const [liveError, setLiveError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("welcome");
  const prevStepRef = useRef<Step>("welcome");
  // Mirror of `step` readable inside async listeners (e.g. the Android
  // hardware back button handler) without needing to re-register.
  const stepRef = useRef<Step>("welcome");
  stepRef.current = step;

  // Detect forward vs backward navigation after each step change and toggle
  // a body class so the slide-in animation runs in the right direction. Uses
  // useLayoutEffect so the class is set between DOM commit and paint — the
  // freshly-mounted <main> sees the class when its CSS animations start.
  useLayoutEffect(() => {
    const prev = prevStepRef.current;
    if (prev === step) return;
    const prevIdx = (ALL_STEPS as readonly string[]).indexOf(prev);
    const nextIdx = (ALL_STEPS as readonly string[]).indexOf(step);
    const goingBack = prevIdx >= 0 && nextIdx >= 0 && nextIdx < prevIdx;
    if (typeof document !== "undefined") {
      document.body.classList.toggle("onb-anim-back", goingBack);
    }
    prevStepRef.current = step;
  }, [step]);
  const [status_, setStatusAnswer] = useState<string | null>(null);
  const [approaches, setApproaches] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [experience, setExperience] = useState<string | null>(null);
  const [location, setLocation] = useState<string | null>(null);
  const [birthMonth, setBirthMonth] = useState<number | null>(null);
  const [birthDay, setBirthDay] = useState<number | null>(null);
  const [birthYear, setBirthYear] = useState<number | null>(2001);
  const [goals, setGoals] = useState<string[]>([]);
  const [blocker, setBlocker] = useState<string | null>(null);
  const [weeklyTarget, setWeeklyTarget] = useState<number>(5);
  const [referralCode, setReferralCode] = useState<string>("");
  const [showApple, setShowApple] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"yearly" | "monthly">("yearly");
  const [purchasing, setPurchasing] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [iapPackages, setIapPackages] = useState<{ monthly?: any; yearly?: any }>({});
  const [reviewerOpen, setReviewerOpen] = useState(false);
  const [reviewerEmail, setReviewerEmail] = useState("");
  const [reviewerPassword, setReviewerPassword] = useState("");
  const [reviewerLoading, setReviewerLoading] = useState(false);
  const targetTrackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setShowApple(isApplePlatform());
    return () => {
      if (typeof document !== "undefined") {
        document.body.classList.remove("onb-anim-back");
      }
    };
  }, []);

  // Load IAP offerings when the user reaches the paywall, so tapping the CTA
  // can fire the native purchase sheet immediately without a loading stall.
  useEffect(() => {
    if (step !== "trialPayment") return;
    if (!isNativePlatform()) return;
    let cancelled = false;
    (async () => {
      await initPurchases();
      if (session?.user?.id) await identifyUser(session.user.id);
      let offering = await getOfferings();
      for (let i = 0; i < 3 && !offering?.availablePackages; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        offering = await getOfferings();
      }
      if (cancelled) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pkgs: { monthly?: any; yearly?: any } = {};
      for (const pkg of offering?.availablePackages || []) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const p = pkg as any;
        if (p.packageType === "MONTHLY") pkgs.monthly = p;
        else if (p.packageType === "ANNUAL") pkgs.yearly = p;
      }
      setIapPackages(pkgs);
    })();
    return () => { cancelled = true; };
  }, [step, session?.user?.id]);

  const handleStartTrial = async () => {
    if (purchasing) return;
    setPurchasing(true);
    try {
      if (isNativePlatform()) {
        const pkg = selectedPlan === "monthly" ? iapPackages.monthly : iapPackages.yearly;
        if (!pkg) {
          setLiveError("This plan isn't available yet. Try again in a moment.");
          return;
        }
        if (session?.user?.id) await identifyUser(session.user.id);
        const ok = await purchasePackage(pkg);
        if (ok) {
          window.location.href = "/";
        }
        return;
      }
      // Web (Stripe) — requires the user to be signed in.
      if (!session?.user?.id) {
        router.push(`/plans?plan=${selectedPlan}`);
        return;
      }
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan }),
      });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; return; }
      setLiveError(data.error || "Couldn't start checkout. Try again.");
    } catch (e) {
      setLiveError((e as Error)?.message || "Purchase failed.");
    } finally {
      setPurchasing(false);
    }
  };
  const error = liveError || searchParams.get("error");

  const setTargetFromClientX = (clientX: number) => {
    const el = targetTrackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const usable = Math.max(1, rect.width - TARGET_THUMB);
    const pct = Math.max(0, Math.min(1, (clientX - rect.left - TARGET_THUMB / 2) / usable));
    const val = Math.round(TARGET_MIN + pct * (TARGET_MAX - TARGET_MIN));
    setWeeklyTarget(val);
  };

  // Desktop mouse-wheel on the weekly-target slider. React's onWheel is
  // passive so we attach natively to call preventDefault.
  useEffect(() => {
    if (step !== "target") return;
    const el = targetTrackRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const delta = e.deltaY !== 0 ? e.deltaY : e.deltaX;
      if (delta === 0) return;
      e.preventDefault();
      const direction = delta < 0 ? 1 : -1;
      setWeeklyTarget((prev) => Math.max(TARGET_MIN, Math.min(TARGET_MAX, prev + direction)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [step]);

  const toggleGoal = (id: string) => {
    setGoals((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  };


  useEffect(() => {
    setupAuthDeepLinkListener();
    initSocialLogin();
    hideSplash();
    // Users returning from OAuth with ?paywall=1 are mid-onboarding. If
    // they're already Pro (e.g. reinstalled the app), skip the trial
    // paywall and drop them on the real home screen. Otherwise show the
    // trial intro like a new user.
    if (status === "authenticated" && searchParams.get("paywall") === "1") {
      let cancelled = false;
      fetch("/api/stripe/status")
        .then((r) => r.json())
        .then((d) => {
          if (cancelled) return;
          if (d.subscribed || d.subscription?.status === "active") {
            router.replace("/");
          } else {
            setStep("trialIntro");
          }
        })
        .catch(() => {
          if (!cancelled) setStep("trialIntro");
        });
      return () => {
        cancelled = true;
      };
    }
  }, [router, status, searchParams]);

  // Intercept the Android hardware back button. Without this, pressing back
  // pops the webview out of /onboarding and the root route redirects back —
  // the onboarding state resets to "welcome" (and the root flashes briefly
  // during the redirect). Map it to a single step back instead.
  useEffect(() => {
    if (!isNativePlatform()) return;
    let handle: { remove: () => void } | undefined;
    (async () => {
      try {
        const { App } = await import("@capacitor/app");
        handle = await App.addListener("backButton", () => {
          const idx = (ALL_STEPS as readonly string[]).indexOf(stepRef.current);
          if (idx > 0) {
            setStep(ALL_STEPS[idx - 1] as Step);
          }
          // idx === 0 ("welcome") or unknown: swallow the event so the app
          // doesn't exit. User can press home to leave.
        });
      } catch {}
    })();
    return () => {
      handle?.remove();
    };
  }, []);

  // Once the user is authenticated, flush the birthday collected during
  // onboarding to their profile. PlanGenerating already stashed the answers
  // in localStorage; we drain the birth fields here so this only runs once.
  useEffect(() => {
    if (status !== "authenticated") return;
    try {
      const raw = localStorage.getItem("wingmate:onboarding");
      if (!raw) return;
      const data = JSON.parse(raw);
      const patches: Record<string, unknown> = {};
      const { birthMonth, birthDay, birthYear } = data;
      if (birthMonth != null && birthDay != null && birthYear != null) {
        const m = String(birthMonth + 1).padStart(2, "0");
        const d = String(birthDay).padStart(2, "0");
        patches.date_of_birth = `${birthYear}-${m}-${d}`;
      }
      if (typeof data.status === "string") patches.status = data.status;
      if (typeof data.location === "string") patches.location = data.location;
      if (typeof data.blocker === "string") patches.blocker = data.blocker;
      if (Array.isArray(data.goals) && data.goals.length > 0) {
        patches.goal = data.goals.join(",");
      }
      if (typeof data.weeklyTarget === "number") {
        patches.weekly_approach_goal = data.weeklyTarget;
      }
      if (Object.keys(patches).length === 0) return;
      fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patches),
      }).catch(() => {});
      for (const k of ["birthMonth", "birthDay", "birthYear", "status", "location", "blocker", "goals", "weeklyTarget"]) {
        delete data[k];
      }
      localStorage.setItem("wingmate:onboarding", JSON.stringify(data));
    } catch {}
  }, [status]);

  const handleGoogle = async () => {
    setLiveError(null);
    const r = await signInWithGoogle("/onboarding?paywall=1");
    if (r.error) setLiveError(r.error);
  };

  const handleApple = async () => {
    setLiveError(null);
    const r = await signInWithApple("/onboarding?paywall=1");
    if (r.error) setLiveError(r.error);
  };

  const handleReviewer = async () => {
    if (reviewerLoading) return;
    setLiveError(null);
    setReviewerLoading(true);
    try {
      // Reviewer is auto-Pro, so skip the paywall and go straight to the app.
      const r = await signInAsReviewer(reviewerEmail.trim(), reviewerPassword, "/");
      if (r.error) setLiveError(r.error);
    } finally {
      setReviewerLoading(false);
    }
  };

  if (step === "welcome") {
    return (
      <main key={step} className="h-app max-w-md mx-auto flex flex-col px-6 pt-5 pb-4 onb-anim onb-no-divider">
        <PhoneMockup />

        <h1 className="my-auto font-display text-[34px] font-extrabold tracking-tight leading-[1.05] text-center">
          Overcome approach anxiety
        </h1>

        <div className="space-y-4 shrink-0">
          <p className="text-center text-[14px] text-text-muted">
            Already have an account?{" "}
            <button onClick={() => setStep("auth")} className="text-text font-semibold underline press">
              Sign in
            </button>
          </p>
          <button
            onClick={() => setStep("status")}
            className="w-full bg-[#1a1a1a] text-white py-4 rounded-2xl font-semibold text-[16px] press"
          >
            Next
          </button>
        </div>
      </main>
    );
  }

  if (step === "status") {
    return (
      <main key={step} className="h-app max-w-md mx-auto flex flex-col px-6 pt-5 pb-4 onb-anim">
        <QuizHeader onBack={() => setStep("welcome")} progress={progressFor("status")} />

        <div className="mt-8">
          <h1 className="font-display text-[28px] font-bold tracking-tight leading-[1.15]">
            What&apos;s your current status?
          </h1>
          <p className="text-text-muted text-[15px] leading-relaxed mt-2">
            This helps us tailor your plan.
          </p>
        </div>

        <div className="flex-1 flex items-center">
          <div className="w-full space-y-3 onb-list">
            {STATUS_OPTIONS.map((opt) => {
              const selected = status_ === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setStatusAnswer(opt.id)}
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
          onClick={() => setStep("approaches")}
          disabled={!status_}
          className="mt-auto w-full bg-[#1a1a1a] text-white py-4 rounded-2xl font-semibold text-[16px] press disabled:bg-border disabled:text-text-muted disabled:pointer-events-none"
        >
          Next
        </button>
      </main>
    );
  }

  if (step === "approaches") {
    return (
      <main key={step} className="h-app max-w-md mx-auto flex flex-col px-6 pt-5 pb-4 onb-anim">
        <QuizHeader onBack={() => setStep("status")} progress={progressFor("approaches")} />

        <div className="mt-8">
          <h1 className="font-display text-[28px] font-bold tracking-tight leading-[1.15]">
            How many conversations do you start per week?
          </h1>
          <p className="text-text-muted text-[15px] leading-relaxed mt-2">
            We&apos;ll use this to build your plan.
          </p>
        </div>

        <div className="flex-1 flex items-center">
          <div className="w-full space-y-3 onb-list">
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
        </div>

        <button
          onClick={() => setStep("source")}
          disabled={!approaches}
          className="mt-auto w-full bg-[#1a1a1a] text-white py-4 rounded-2xl font-semibold text-[16px] press disabled:bg-border disabled:text-text-muted disabled:pointer-events-none"
        >
          Next
        </button>
      </main>
    );
  }

  if (step === "source") {
    return (
      <main key={step} className="h-app max-w-md mx-auto flex flex-col px-6 pt-5 pb-4 onb-anim">
        <QuizHeader onBack={() => setStep("approaches")} progress={progressFor("source")} />

        <div className="mt-8">
          <h1 className="font-display text-[28px] font-bold tracking-tight leading-[1.15]">
            Where did you hear about us?
          </h1>
        </div>

        <div className="mt-6 flex-1 overflow-y-auto min-h-0 -mx-6 px-6">
          <div className="w-full space-y-3 onb-list py-1">
            {SOURCE_OPTIONS.map((opt) => {
              const selected = source === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setSource(opt.id)}
                  className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 transition-colors press ${
                    selected
                      ? "border-[#1a1a1a] bg-[#1a1a1a] text-white"
                      : "border-border bg-bg-card"
                  }`}
                >
                  <span className="w-7 h-7 flex items-center justify-center shrink-0" aria-hidden>
                    <SourceLogo id={opt.id} selected={selected} />
                  </span>
                  <p className="text-[17px] font-semibold leading-tight truncate text-left">{opt.label}</p>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => setStep("experience")}
          disabled={!source}
          className="mt-auto w-full bg-[#1a1a1a] text-white py-4 rounded-2xl font-semibold text-[16px] press disabled:bg-border disabled:text-text-muted disabled:pointer-events-none"
        >
          Next
        </button>
      </main>
    );
  }

  if (step === "experience") {
    return (
      <main key={step} className="h-app max-w-md mx-auto flex flex-col px-6 pt-5 pb-4 onb-anim">
        <QuizHeader onBack={() => setStep("source")} progress={progressFor("experience")} />

        <div className="mt-8">
          <h1 className="font-display text-[28px] font-bold tracking-tight leading-[1.15]">
            Have you tried other confidence apps?
          </h1>
        </div>

        <div className="flex-1 flex items-center">
          <div className="w-full space-y-3 onb-list">
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
          className="mt-auto w-full bg-[#1a1a1a] text-white py-4 rounded-2xl font-semibold text-[16px] press disabled:bg-border disabled:text-text-muted disabled:pointer-events-none"
        >
          Next
        </button>
      </main>
    );
  }

  if (step === "pitch") {
    return (
      <main key={step} className="h-app max-w-md mx-auto flex flex-col px-6 pt-5 pb-4 onb-anim">
        <QuizHeader onBack={() => setStep("experience")} progress={progressFor("pitch")} />

        <div className="mt-8">
          <h1 className="font-display text-[30px] font-bold tracking-tight leading-[1.1]">
            Wingmate helps you start more conversations.
          </h1>
          <p className="text-text-muted text-[15px] leading-relaxed mt-3">
            Here&apos;s what the first month looks like.
          </p>
        </div>

        <div className="flex-1 flex items-center justify-center py-8">
          <GrowthChart />
        </div>

        <button
          onClick={() => setStep("location")}
          className="mt-auto w-full bg-[#1a1a1a] text-white py-4 rounded-2xl font-semibold text-[16px] press"
        >
          Next
        </button>
      </main>
    );
  }

  if (step === "location") {
    return (
      <main key={step} className="h-app max-w-md mx-auto flex flex-col px-6 pt-5 pb-4 onb-anim">
        <QuizHeader onBack={() => setStep("pitch")} progress={progressFor("location")} />

        <div className="mt-8">
          <h1 className="font-display text-[28px] font-bold tracking-tight leading-[1.15]">
            Where do you live?
          </h1>
          <p className="text-text-muted text-[15px] leading-relaxed mt-2">
            This helps us tailor approach suggestions.
          </p>
        </div>

        <div className="flex-1 flex items-center">
          <div className="w-full space-y-3 onb-list">
          {LOCATION_OPTIONS.map((opt) => {
            const selected = location === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setLocation(opt.id)}
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
                  <p className="text-[18px] font-semibold leading-tight">{opt.label}</p>
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
        </div>

        <button
          onClick={() => setStep("birthday")}
          disabled={!location}
          className="mt-auto w-full bg-[#1a1a1a] text-white py-4 rounded-2xl font-semibold text-[16px] press disabled:bg-border disabled:text-text-muted disabled:pointer-events-none"
        >
          Next
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
      <main key={step} className="h-app max-w-md mx-auto flex flex-col px-6 pt-5 pb-4 onb-anim">
        <QuizHeader onBack={() => setStep("location")} progress={progressFor("birthday")} />

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
          className="mt-auto w-full bg-[#1a1a1a] text-white py-4 rounded-2xl font-semibold text-[16px] press disabled:bg-border disabled:text-text-muted disabled:pointer-events-none"
        >
          Next
        </button>
      </main>
    );
  }

  if (step === "goal") {
    return (
      <main key={step} className="h-app max-w-md mx-auto flex flex-col px-6 pt-5 pb-4 onb-anim">
        <QuizHeader onBack={() => setStep("birthday")} progress={progressFor("goal")} />

        <div className="mt-8">
          <h1 className="font-display text-[28px] font-bold tracking-tight leading-[1.15]">
            What is your goal?
          </h1>
          <p className="text-text-muted text-[15px] leading-relaxed mt-2">
            Pick any that apply.
          </p>
        </div>

        <div className="flex-1 flex items-center">
          <div className="w-full space-y-3 onb-list">
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
          className="mt-auto w-full bg-[#1a1a1a] text-white py-4 rounded-2xl font-semibold text-[16px] press disabled:bg-border disabled:text-text-muted disabled:pointer-events-none"
        >
          Next
        </button>
      </main>
    );
  }

  if (step === "target") {
    return (
      <main key={step} className="h-app max-w-md mx-auto flex flex-col px-6 pt-5 pb-4 onb-anim">
        <QuizHeader onBack={() => setStep("goal")} progress={progressFor("target")} />

        <div className="mt-8">
          <h1 className="font-display text-[28px] font-bold tracking-tight leading-[1.15]">
            How many conversations do you want to start per week?
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
              {weeklyTarget === 1 ? "conversation / week" : "conversations / week"}
            </span>
          </div>

          <div className="w-full px-3">
            <div
              ref={targetTrackRef}
              role="slider"
              tabIndex={0}
              aria-valuemin={TARGET_MIN}
              aria-valuemax={TARGET_MAX}
              aria-valuenow={weeklyTarget}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                setTargetFromClientX(e.clientX);
              }}
              onPointerMove={(e) => {
                if (e.buttons & 1) setTargetFromClientX(e.clientX);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                  e.preventDefault();
                  setWeeklyTarget((v) => Math.max(TARGET_MIN, v - 1));
                } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                  e.preventDefault();
                  setWeeklyTarget((v) => Math.min(TARGET_MAX, v + 1));
                }
              }}
              className="relative h-12 flex items-center cursor-pointer outline-none select-none"
              style={{ touchAction: "none" }}
            >
              {/* Thin track */}
              <div className="absolute left-0 right-0 h-1 bg-bg-input rounded-full pointer-events-none" />
              {/* Filled portion — reaches thumb center */}
              <div
                className="absolute left-0 h-1 bg-[#1a1a1a] rounded-full pointer-events-none"
                style={{
                  width: `calc(${((weeklyTarget - TARGET_MIN) / (TARGET_MAX - TARGET_MIN)) * 100}% + ${TARGET_THUMB / 2 - ((weeklyTarget - TARGET_MIN) / (TARGET_MAX - TARGET_MIN)) * TARGET_THUMB}px)`,
                }}
              />
              {/* Clean circular thumb — inset so it stays inside the track */}
              <div
                className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
                style={{
                  left: `calc(${((weeklyTarget - TARGET_MIN) / (TARGET_MAX - TARGET_MIN)) * 100}% - ${((weeklyTarget - TARGET_MIN) / (TARGET_MAX - TARGET_MIN)) * TARGET_THUMB}px)`,
                }}
              >
                <div className="w-7 h-7 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.12),0_0_0_0.5px_rgba(0,0,0,0.08)]" />
              </div>
            </div>
            <div className="flex justify-between mt-3 text-[11px] font-medium text-text-muted">
              <span>{TARGET_MIN}</span>
              <span>{TARGET_MAX}+</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setStep("doable")}
          className="mt-auto w-full bg-[#1a1a1a] text-white py-4 rounded-2xl font-semibold text-[16px] press"
        >
          Next
        </button>
      </main>
    );
  }

  if (step === "doable") {
    return (
      <main key={step} className="h-app max-w-md mx-auto flex flex-col px-6 pt-5 pb-4 onb-anim">
        <QuizHeader onBack={() => setStep("target")} progress={progressFor("doable")} />

        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mb-8">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12l5 5L20 6" />
            </svg>
          </div>

          <h1 className="font-display text-[32px] font-extrabold tracking-tight leading-[1.1] mb-4">
            <span className="text-green-500">
              {weeklyTarget} {weeklyTarget === 1 ? "conversation" : "conversations"}
            </span>{" "}
            a week is totally doable.
          </h1>
          <p className="text-text-muted text-[15px] leading-relaxed max-w-[320px]">
            That&apos;s just {weeklyTarget === 1 ? "one approach" : Math.ceil(weeklyTarget / 7) + " or so a day"}. With Wingmate in your pocket, you&apos;ve got this.
          </p>
        </div>

        <button
          onClick={() => setStep("blockers")}
          className="mt-auto w-full bg-[#1a1a1a] text-white py-4 rounded-2xl font-semibold text-[16px] press"
        >
          Next
        </button>
      </main>
    );
  }

  if (step === "blockers") {
    return (
      <main key={step} className="h-app max-w-md mx-auto flex flex-col px-6 pt-5 pb-4 onb-anim">
        <QuizHeader onBack={() => setStep("doable")} progress={progressFor("blockers")} />

        <div className="mt-8">
          <h1 className="font-display text-[28px] font-bold tracking-tight leading-[1.15]">
            What&apos;s stopping you from reaching your goals?
          </h1>
          <p className="text-text-muted text-[15px] leading-relaxed mt-2">
            Pick the biggest one.
          </p>
        </div>

        <div className="flex-1 flex items-center">
          <div className="w-full space-y-3 onb-list">
            {BLOCKER_OPTIONS.map((opt) => {
              const selected = blocker === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setBlocker(opt.id)}
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
          onClick={() => setStep("thanks")}
          disabled={!blocker}
          className="mt-auto w-full bg-[#1a1a1a] text-white py-4 rounded-2xl font-semibold text-[16px] press disabled:bg-border disabled:text-text-muted disabled:pointer-events-none"
        >
          Next
        </button>
      </main>
    );
  }

  if (step === "thanks") {
    return (
      <main key={step} className="h-app max-w-md mx-auto flex flex-col px-6 pt-5 pb-4 onb-anim">
        <QuizHeader onBack={() => setStep("blockers")} progress={progressFor("thanks")} />

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
          className="mt-auto w-full bg-[#1a1a1a] text-white py-4 rounded-2xl font-semibold text-[16px] press"
        >
          Next
        </button>
      </main>
    );
  }

  if (step === "notifications") {
    return (
      <NotificationsStep
        onBack={() => setStep("thanks")}
        onContinue={() => setStep("rating")}
      />
    );
  }

  if (step === "rating") {
    return (
      <main key={step} className="h-app max-w-md mx-auto flex flex-col px-6 pt-5 pb-4 onb-anim">
        <QuizHeader onBack={() => setStep("notifications")} progress={progressFor("rating")} />

        <div className="mt-8 text-center">
          <h1 className="font-display text-[28px] font-bold tracking-tight leading-[1.15]">
            Help us reach more guys.
          </h1>
          <p className="text-text-muted text-[15px] leading-relaxed mt-2">
            If Wingmate has you feeling more confident, a rating goes a long way.
          </p>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg key={i} width="44" height="44" viewBox="0 0 24 24" fill="#FBBF24" stroke="#FBBF24" strokeWidth="1.5" strokeLinejoin="round">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            ))}
          </div>
        </div>

        <button
          onClick={() => setStep("referral")}
          className="mt-auto w-full bg-[#1a1a1a] text-white py-4 rounded-2xl font-semibold text-[16px] press"
        >
          Continue
        </button>
      </main>
    );
  }

  if (step === "referral") {
    const trimmed = referralCode.trim();
    return (
      <main key={step} className="h-app max-w-md mx-auto flex flex-col px-6 pt-5 pb-4 onb-anim">
        <QuizHeader onBack={() => setStep("rating")} progress={progressFor("referral")} />

        <div className="mt-8">
          <h1 className="font-display text-[28px] font-bold tracking-tight leading-[1.15]">
            Enter referral code (optional)
          </h1>
          <p className="text-text-muted text-[15px] leading-relaxed mt-2">
            You can skip this step.
          </p>
        </div>

        <div className="flex-1 flex items-center">
          <form
            onSubmit={(e) => { e.preventDefault(); setStep("planIntro"); }}
            className="w-full flex items-center gap-2 bg-bg-card border border-border rounded-full pl-5 pr-1.5 py-1.5 shadow-card"
          >
            <input
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase().replace(/\s+/g, ""))}
              placeholder="Referral Code"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              maxLength={32}
              className="flex-1 bg-transparent text-text text-[15px] placeholder-text-muted/60 focus:outline-none py-2 min-w-0"
            />
            <button
              type="submit"
              disabled={!trimmed}
              aria-label="Apply referral code"
              className="bg-[#1a1a1a] disabled:opacity-15 text-white w-9 h-9 flex items-center justify-center rounded-full press shrink-0 transition-opacity"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
          </form>
        </div>

        <button
          onClick={() => setStep("planIntro")}
          className="mt-auto w-full bg-[#1a1a1a] text-white py-4 rounded-2xl font-semibold text-[16px] press"
        >
          Continue
        </button>
      </main>
    );
  }

  if (step === "planIntro") {
    return (
      <main key={step} className="h-app max-w-md mx-auto flex flex-col px-6 pt-5 pb-4 onb-anim">
        <QuizHeader onBack={() => setStep("referral")} progress={progressFor("planIntro")} />

        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-8">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
              <path d="M9 13l2 2 4-4" />
            </svg>
          </div>
          <h1 className="font-display text-[32px] font-extrabold tracking-tight leading-[1.1]">
            Time to build your plan.
          </h1>
        </div>

        <button
          onClick={() => setStep("planGenerating")}
          className="mt-auto w-full bg-[#1a1a1a] text-white py-4 rounded-2xl font-semibold text-[16px] press"
        >
          Generate my plan
        </button>
      </main>
    );
  }

  if (step === "planGenerating") {
    const answers = {
      status: status_,
      approaches,
      source,
      experience,
      location,
      birthMonth,
      birthDay,
      birthYear,
      goals,
      weeklyTarget,
      blocker,
    };
    return (
      <PlanGenerating
        answers={answers}
        onDone={() => setStep("planReady")}
      />
    );
  }

  if (step === "planReady") {
    const plan = buildPlan({
      status: status_,
      location,
      goals,
      weeklyTarget,
      blocker,
    });
    return (
      <main key={step} className="h-app max-w-md mx-auto flex flex-col px-6 pt-5 pb-4 onb-anim">
        <QuizHeader onBack={() => setStep("planIntro")} progress={progressFor("planReady")} />

        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-600 px-3 py-1 rounded-full text-[12px] font-semibold mb-4">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12l5 5L20 6" />
            </svg>
            Ready
          </div>
          <h1 className="font-display text-[30px] font-extrabold tracking-tight leading-[1.1]">
            Your custom plan is ready.
          </h1>
          <p className="text-text-muted text-[14px] leading-relaxed mt-2">
            Built from your answers. Tweak anytime.
          </p>
        </div>

        <div className="flex-1 flex items-center py-6">
          <div className="w-full bg-bg-card border border-border rounded-2xl shadow-card p-5 space-y-4">
            <div className="flex items-baseline justify-between">
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">Weekly target</p>
              <p className="font-display text-[24px] font-extrabold leading-none tabular-nums">{weeklyTarget}</p>
            </div>
            <div className="border-t border-border pt-4 space-y-3">
              {plan.bullets.map((b, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-[18px] leading-none shrink-0 mt-0.5" aria-hidden>{b.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold leading-tight">{b.title}</p>
                    <p className="text-[12.5px] text-text-muted leading-snug mt-0.5">{b.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={() => setStep("auth")}
          className="mt-auto w-full bg-[#1a1a1a] text-white py-4 rounded-2xl font-semibold text-[16px] press"
        >
          Let&apos;s do this
        </button>
      </main>
    );
  }

  if (step === "trialIntro") {
    return (
      <main key={step} className="h-app max-w-md mx-auto flex flex-col px-6 pt-5 pb-4 onb-anim onb-no-divider">
        <TrialHeader onClose={() => setStep("auth")} />

        <h1 className="mt-2 font-display text-[28px] font-extrabold tracking-tight leading-[1.1] text-center">
          We want you to try Wingmate for free.
        </h1>

        <div className="flex-1 flex items-center justify-center min-h-0 py-4">
          <PhoneMockup width="clamp(220px, 50vw, 280px)" />
        </div>

        <div className="shrink-0 pb-2">
          <p className="text-center text-[14px] font-medium text-text-muted mb-3">
            No Payment Due Now
          </p>
          <button
            onClick={() => setStep("trialReminder")}
            className="w-full bg-[#1a1a1a] text-white py-[20px] rounded-2xl font-bold text-[18px] press"
          >
            Try for $0.00
          </button>
          <p className="text-center text-[12px] text-text-muted mt-3">
            Just <span className="font-semibold text-text">$29.99/year</span> ($2.49/mo)
          </p>
        </div>
      </main>
    );
  }

  if (step === "trialReminder") {
    return (
      <main key={step} className="h-app max-w-md mx-auto flex flex-col px-6 pt-5 pb-4 onb-anim onb-no-divider">
        <TrialHeader onBack={() => setStep("trialIntro")} onClose={() => setStep("auth")} />

        <div className="mt-6 text-center">
          <h1 className="font-display text-[26px] font-bold tracking-tight leading-[1.15]">
            We&apos;ll send you a reminder before your free trial ends.
          </h1>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="w-40 h-40 rounded-[44px] bg-[#1a1a1a] flex items-center justify-center shadow-[0_20px_50px_-12px_rgba(0,0,0,0.35)]">
            <svg width="88" height="88" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
          </div>
        </div>

        <div className="shrink-0 pb-2">
          <p className="text-center text-[14px] font-medium text-text-muted mb-3">
            No Payment Due Now
          </p>
          <button
            onClick={() => setStep("trialPayment")}
            className="w-full bg-[#1a1a1a] text-white py-[20px] rounded-2xl font-bold text-[18px] press"
          >
            Continue for FREE
          </button>
          <p className="text-center text-[12px] text-text-muted mt-3">
            Just <span className="font-semibold text-text">$29.99/year</span> ($2.49/mo)
          </p>
        </div>
      </main>
    );
  }

  if (step === "trialPayment") {
    const isYearly = selectedPlan === "yearly";
    const features = [
      { icon: MessageCircle, label: "Unlimited AI coaching" },
      { icon: Target, label: "Approach tracker & stats" },
      { icon: Flame, label: "Daily check-ins & streaks" },
      { icon: Users, label: "Community access" },
    ];
    return (
      <main key={step} className="h-app max-w-md mx-auto flex flex-col px-6 pt-5 pb-4 onb-anim onb-no-divider">
        <TrialHeader onBack={() => setStep("trialReminder")} onClose={() => setStep("auth")} />

        <div className="mt-6 text-center">
          <h1 className="font-display text-[26px] font-bold tracking-tight leading-[1.1]">
            Start your 3-day <span className="text-green-500">FREE</span> trial to continue.
          </h1>
        </div>

        <div className="flex-1 flex flex-col justify-center min-h-0 py-6">
          <ul className="space-y-4">
            {features.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center shrink-0">
                  <Icon size={18} strokeWidth={2} className="text-white" />
                </span>
                <span className="text-[15px] font-medium">{label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="shrink-0 pb-2">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => setSelectedPlan("monthly")}
              className={`rounded-2xl border-2 p-4 text-left press transition-colors bg-bg-card ${
                !isYearly ? "border-[#1a1a1a]" : "border-border"
              }`}
            >
              <p className="font-semibold text-[15px]">Monthly</p>
              <p className="font-display text-[16px] font-extrabold mt-2">$9.99/month</p>
            </button>

            <button
              onClick={() => setSelectedPlan("yearly")}
              className={`relative rounded-2xl border-2 p-4 text-left press transition-colors bg-bg-card ${
                isYearly ? "border-[#1a1a1a]" : "border-border"
              }`}
            >
              <span className="absolute -top-2.5 right-3 bg-green-500 text-white text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full">
                3 days free
              </span>
              <p className="font-semibold text-[15px]">Yearly</p>
              <p className="font-display text-[16px] font-extrabold mt-2">$29.99/year</p>
            </button>
          </div>

          <button
            onClick={handleStartTrial}
            disabled={purchasing}
            className="w-full bg-[#1a1a1a] text-white py-[20px] rounded-2xl font-bold text-[18px] press disabled:opacity-60"
          >
            {purchasing
              ? "Starting…"
              : isYearly
              ? "Start my 3-day free trial"
              : "Subscribe — $9.99/mo"}
          </button>
          <p className="text-center text-[12px] text-text-muted mt-3">
            {isYearly ? (
              <>
                <span className="font-semibold text-text">3 days free</span>, then $2.49/mo. Cancel anytime.
              </>
            ) : (
              <>
                <span className="font-semibold text-text">$9.99/month</span>, auto-renews until cancelled.
              </>
            )}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main key={step} className="h-app max-w-md mx-auto flex flex-col px-6 pt-5 pb-4 onb-anim onb-no-divider">
      <QuizHeader onBack={() => setStep("planReady")} progress={progressFor("auth")} />

      <div className="mt-8">
        <h1 className="font-display text-[28px] font-bold tracking-tight leading-[1.15]">
          Create an account
        </h1>
      </div>

      <div className="flex-1 flex flex-col justify-center">
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
            className="w-full flex items-center justify-center gap-3 bg-[#1a1a1a] text-white border border-[#1a1a1a] py-4 rounded-2xl font-semibold text-[16px] press"
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continue with Google
          </button>

          {showApple && (
            <button
              onClick={handleApple}
              className="w-full flex items-center justify-center gap-3 bg-[#1a1a1a] text-white border border-[#1a1a1a] py-4 rounded-2xl font-semibold text-[16px] press"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.32-2.11 4.45-3.74 4.25z"/>
              </svg>
              Continue with Apple
            </button>
          )}

          <button
            onClick={() => setStep("trialIntro")}
            className="w-full bg-bg-card border-2 border-border py-4 rounded-2xl font-semibold text-[16px] press"
          >
            Skip
          </button>

          <div className="pt-2">
            {!reviewerOpen ? (
              <button
                onClick={() => setReviewerOpen(true)}
                className="w-full text-text-muted text-[13px] font-medium press py-1 underline underline-offset-4"
              >
                Reviewer access
              </button>
            ) : (
              <form
                onSubmit={(e) => { e.preventDefault(); handleReviewer(); }}
                className="space-y-2 animate-fade-in"
              >
                <p className="text-[12px] text-text-muted text-center">
                  App Store / Play Store reviewer login.
                </p>
                <input
                  type="email"
                  value={reviewerEmail}
                  onChange={(e) => setReviewerEmail(e.target.value)}
                  placeholder="reviewer email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full bg-bg-card border border-border rounded-xl px-4 py-3 text-[15px] outline-none focus:border-text-muted transition-colors"
                />
                <input
                  type="password"
                  value={reviewerPassword}
                  onChange={(e) => setReviewerPassword(e.target.value)}
                  placeholder="password"
                  className="w-full bg-bg-card border border-border rounded-xl px-4 py-3 text-[15px] outline-none focus:border-text-muted transition-colors"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setReviewerOpen(false); setReviewerEmail(""); setReviewerPassword(""); }}
                    className="flex-1 bg-bg-card border border-border py-3 rounded-xl font-medium text-[14px] text-text-muted press"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reviewerLoading || !reviewerEmail.trim() || !reviewerPassword}
                    className="flex-1 bg-[#1a1a1a] disabled:opacity-40 text-white py-3 rounded-xl font-semibold text-[14px] press"
                  >
                    {reviewerLoading ? "Signing in…" : "Sign in"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

type PlanAnswers = {
  status: string | null;
  approaches: string | null;
  source: string | null;
  experience: string | null;
  location: string | null;
  birthMonth: number | null;
  birthDay: number | null;
  birthYear: number | null;
  goals: string[];
  weeklyTarget: number;
  blocker: string | null;
};

const GEN_STAGES = [
  "Analyzing your answers",
  "Matching your vibe and goals",
  "Building weekly routines",
  "Tuning your focus areas",
  "Finalizing your plan",
];

function PlanGenerating({ answers, onDone }: { answers: PlanAnswers; onDone: () => void }) {
  const [pct, setPct] = useState(0);
  const savedRef = useRef(false);

  useEffect(() => {
    // Persist answers once on mount so the plan is tied to this session.
    if (!savedRef.current) {
      try {
        localStorage.setItem(
          "wingmate:onboarding",
          JSON.stringify({ ...answers, savedAt: Date.now() })
        );
      } catch {}
      savedRef.current = true;
    }

    const duration = 3800;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out quint
      const eased = 1 - Math.pow(1 - t, 5);
      setPct(Math.round(eased * 100));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setTimeout(onDone, 350);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [answers, onDone]);

  const stageIdx = Math.min(GEN_STAGES.length - 1, Math.floor((pct / 100) * GEN_STAGES.length));

  return (
    <main className="h-app max-w-md mx-auto flex flex-col px-6 pt-5 pb-4 onb-anim">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="relative w-36 h-36 mb-8">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="46" stroke="#efefef" strokeWidth="6" fill="none" />
            <circle
              cx="50" cy="50" r="46"
              stroke="#1a1a1a" strokeWidth="6" fill="none"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 46}
              strokeDashoffset={2 * Math.PI * 46 * (1 - pct / 100)}
              style={{ transition: "stroke-dashoffset 80ms linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-[40px] font-extrabold tabular-nums leading-none">
              {pct}
              <span className="text-[22px] font-bold text-text-muted">%</span>
            </span>
          </div>
        </div>

        <h1 className="font-display text-[26px] font-bold tracking-tight leading-[1.15] mb-2">
          Building your plan...
        </h1>
        <p className="text-text-muted text-[14px] leading-relaxed min-h-[20px]">
          {GEN_STAGES[stageIdx]}
        </p>

        <div className="w-full max-w-[280px] mt-8 space-y-2">
          {GEN_STAGES.map((stage, i) => {
            const done = i < stageIdx || pct >= 100;
            const active = i === stageIdx && pct < 100;
            return (
              <div key={stage} className="flex items-center gap-3 text-left">
                <div
                  className={`w-4 h-4 rounded-full shrink-0 flex items-center justify-center ${
                    done ? "bg-[#1a1a1a]" : active ? "border-2 border-[#1a1a1a]" : "border-2 border-border"
                  }`}
                >
                  {done && (
                    <svg width="8" height="8" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="3">
                      <path d="M3 8l3 3 7-7" />
                    </svg>
                  )}
                </div>
                <span className={`text-[13px] ${done || active ? "text-text font-medium" : "text-text-muted"}`}>
                  {stage}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}

function buildPlan({
  status,
  location,
  goals,
  weeklyTarget,
  blocker,
}: {
  status: string | null;
  location: string | null;
  goals: string[];
  weeklyTarget: number;
  blocker: string | null;
}) {
  const perDay = weeklyTarget <= 1 ? "1 approach this week" : `${Math.max(1, Math.ceil(weeklyTarget / 7))}/day`;

  const focusByBlocker: Record<string, { emoji: string; title: string; body: string }> = {
    rejection: {
      emoji: "🛡️",
      title: "Rejection reps",
      body: "Short daily drills that reframe rejection as data, not defeat.",
    },
    words: {
      emoji: "💬",
      title: "Opener playbook",
      body: "Prebuilt openers for your exact scenarios so you're never stuck.",
    },
    confidence: {
      emoji: "🔥",
      title: "Confidence routine",
      body: "A 5-minute morning reset so you show up grounded, not shaky.",
    },
    time: {
      emoji: "⚡",
      title: "Micro-approaches",
      body: "Low-stakes 10-second reps you can run any time you're out.",
    },
  };

  const focus = blocker ? focusByBlocker[blocker] : focusByBlocker.rejection;

  const envByLocation: Record<string, { emoji: string; title: string; body: string }> = {
    city: {
      emoji: "🏙️",
      title: "City hotspots",
      body: "Coffee shops, bookstores, parks — a weekly rotation of places to go.",
    },
    suburb: {
      emoji: "🏡",
      title: "Suburb game plan",
      body: "Gyms, cafés, events — where to reliably meet people near you.",
    },
    town: {
      emoji: "🏘️",
      title: "Small town angle",
      body: "Lean into the fact that you'll see them again. Warmth over novelty.",
    },
    rural: {
      emoji: "🌾",
      title: "Rural strategy",
      body: "Travel approaches, apps, and social events for wider reach.",
    },
  };
  const env = location ? envByLocation[location] : envByLocation.city;

  const goalLine = goals.length
    ? goals.includes("girlfriend")
      ? "tracked toward getting a girlfriend"
      : goals.includes("rizz")
      ? "tuned for improving your rizz"
      : "built for having more fun"
    : "built around your answers";

  return {
    summary: `A plan ${goalLine}, with ${perDay} as your rhythm.`,
    bullets: [
      { emoji: "🎯", title: "Daily rhythm", body: `${perDay} — small, repeatable, compounding.` },
      focus,
      env,
      {
        emoji: "🧠",
        title: "AI coach on call",
        body: `Real-time advice in the moment — specific to ${status === "student" ? "school" : status === "working" ? "workplace" : "your"} settings.`,
      },
    ],
  };
}

function TrialHeader({ onBack, onClose }: { onBack?: () => void; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between h-11">
      {onBack ? (
        <button onClick={onBack} className="p-2 -ml-2 press shrink-0 text-[#b5b5b5]" aria-label="Back">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      ) : (
        <div aria-hidden />
      )}
      <button onClick={onClose} className="p-2 -mr-2 press shrink-0 text-[#b5b5b5]" aria-label="Close">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
    </div>
  );
}

function NotificationsStep({
  onBack,
  onContinue,
}: {
  onBack: () => void;
  onContinue: () => void;
}) {
  const [requesting, setRequesting] = useState(false);

  // Tied to the Continue button rather than the screen mount — iOS treats
  // gesture-initiated permission requests as more legitimate, and ties the
  // dialog appearance to clear user intent. iOS only shows the system
  // dialog once ever; if the user previously declined, we silently fall
  // through and continue.
  const requestAndContinue = async () => {
    if (requesting) return;
    setRequesting(true);
    try {
      if (typeof window !== "undefined" && window.Capacitor?.isNativePlatform()) {
        const { PushNotifications } = await import("@capacitor/push-notifications");
        const existing = await PushNotifications.checkPermissions();
        if (existing.receive === "prompt" || existing.receive === "prompt-with-rationale") {
          await PushNotifications.requestPermissions();
        }
      } else if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "default") {
          await Notification.requestPermission();
        }
      }
    } catch {}
    setRequesting(false);
    onContinue();
  };

  return (
    <main key="notifications" className="h-app max-w-md mx-auto flex flex-col px-6 pt-5 pb-4 onb-anim">
      <QuizHeader onBack={onBack} progress={progressFor("notifications")} />

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

      <button
        onClick={requestAndContinue}
        disabled={requesting}
        className="mt-auto w-full bg-[#1a1a1a] text-white py-4 rounded-2xl font-semibold text-[16px] press disabled:opacity-60"
      >
        {requesting ? "..." : "Enable notifications"}
      </button>
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

  // Desktop mouse-wheel: advance one item per notch (React's synthetic
  // onWheel is passive so we attach natively to call preventDefault).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let lastTime = 0;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const now = performance.now();
      if (now - lastTime < 60) return;
      lastTime = now;
      const currentIdx = Math.round(el.scrollTop / ITEM_HEIGHT);
      const direction = e.deltaY > 0 ? 1 : -1;
      const newIdx = Math.max(0, Math.min(options.length - 1, currentIdx + direction));
      el.scrollTo({ top: newIdx * ITEM_HEIGHT, behavior: "smooth" });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [options.length]);

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

// Persists across QuizHeader remounts (main is keyed by step, so the header
// unmounts on each step change — a CSS transition on a fresh node has no
// "from" value to animate from). We remember the last rendered progress
// and replay the from→to change after mount so transition-all fires.
let lastProgressValue = 0;

function QuizHeader({ onBack, progress }: { onBack: () => void; progress: number }) {
  const barRef = useRef<HTMLDivElement>(null);
  const initialWidth = Math.max(0, Math.min(1, lastProgressValue)) * 100;

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const to = Math.max(0, Math.min(1, progress)) * 100;
    const raf = requestAnimationFrame(() => {
      el.style.width = `${to}%`;
    });
    lastProgressValue = progress;
    return () => cancelAnimationFrame(raf);
  }, [progress]);

  return (
    <div className="flex items-center gap-3 shrink-0 h-11">
      <button
        onClick={onBack}
        className="w-11 h-11 rounded-full bg-bg-input flex items-center justify-center press shrink-0"
        aria-label="Back"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <div className="flex-1 min-w-0 h-1.5 bg-bg-input rounded-full overflow-hidden">
        <div
          ref={barRef}
          className="h-full bg-[#1a1a1a] rounded-full transition-all duration-300"
          style={{ width: `${initialWidth}%` }}
        />
      </div>
    </div>
  );
}

type DemoMessage = { from: "user" | "ai"; text: React.ReactNode; typingMs: number; settleMs: number };

const DEMO_SCRIPT: DemoMessage[] = [
  {
    from: "user",
    text: <>She&apos;s right across from me at the coffee shop. What do I say??</>,
    typingMs: 700,
    settleMs: 350,
  },
  {
    from: "ai",
    text: "Go NOW bro. 10 seconds of courage.",
    typingMs: 900,
    settleMs: 250,
  },
  {
    from: "ai",
    text: <>Walk over. Eye contact. &ldquo;Hey, I know this is random but you caught my eye.&rdquo;</>,
    typingMs: 1300,
    settleMs: 800,
  },
  {
    from: "user",
    text: <>It worked. Got her number 🔥</>,
    typingMs: 700,
    settleMs: 250,
  },
  {
    from: "ai",
    text: <>LET&apos;S GOOOO KING 👑</>,
    typingMs: 800,
    settleMs: 1800,
  },
];

function PhoneMockup({ width = "clamp(220px, 50vw, 280px)" }: { width?: string } = {}) {
  // Index of how many messages have fully landed in the chat. Cycles back to 0
  // after the last message + a pause so the demo loops while the welcome
  // screen is visible.
  const [shown, setShown] = useState(0);
  // Whether the next sender is currently "typing" — drives the animated dots
  // that appear above the next bubble before it lands.
  const [typing, setTyping] = useState<"user" | "ai" | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const t = setTimeout(resolve, ms);
        timeouts.push(t);
      });

    (async () => {
      // Small initial pause so the welcome screen renders before messages
      // start landing.
      await wait(500);
      while (!cancelled) {
        for (let i = 0; i < DEMO_SCRIPT.length; i++) {
          if (cancelled) return;
          const msg = DEMO_SCRIPT[i];
          setTyping(msg.from);
          await wait(msg.typingMs);
          if (cancelled) return;
          setTyping(null);
          setShown(i + 1);
          await wait(msg.settleMs);
        }
        // Hold the full conversation briefly, then reset and replay.
        await wait(2400);
        if (cancelled) return;
        setShown(0);
        await wait(400);
      }
    })();

    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
    };
  }, []);

  return (
    <div
      className="mx-auto relative select-none pointer-events-none"
      style={{ width }}
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

            {/* Messages — stack from the top of the chat area downward so
                bubbles never overlap the input pill. Bottom value clears
                the input bar (bottom: 18 + ~36px tall + 8px buffer). */}
            <div
              className="absolute left-0 right-0 px-3 flex flex-col gap-1.5 overflow-hidden"
              style={{ top: "82px", bottom: "62px" }}
            >
              {DEMO_SCRIPT.slice(0, shown).map((m, i) => (
                <MessageBubble key={i} from={m.from}>
                  {m.text}
                </MessageBubble>
              ))}
              {typing && <TypingBubble from={typing} />}
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
    <div className={`flex demo-msg-in ${isUser ? "justify-end" : "justify-start"}`}>
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

function TypingBubble({ from }: { from: "user" | "ai" }) {
  const isUser = from === "user";
  return (
    <div className={`flex demo-msg-in ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`px-2.5 py-2 text-[10px] leading-none flex items-center gap-1 ${
          isUser
            ? "bg-[#1a1a1a] rounded-[14px] rounded-br-[4px]"
            : "bg-bg-input rounded-[14px] rounded-bl-[4px]"
        }`}
        aria-label="typing"
      >
        <span className={`demo-typing-dot ${isUser ? "bg-white/70" : "bg-text-muted"}`} />
        <span className={`demo-typing-dot ${isUser ? "bg-white/70" : "bg-text-muted"}`} style={{ animationDelay: "150ms" }} />
        <span className={`demo-typing-dot ${isUser ? "bg-white/70" : "bg-text-muted"}`} style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}
