"use client";

import Link from "next/link";
import { Check, MessageCircle, BarChart3, Users, Shield } from "lucide-react";
import { signInWithGoogle } from "@/lib/supabase-browser";

const FEATURES = [
  {
    icon: MessageCircle,
    title: "AI Coaching",
    description: "Get real-time advice on what to say, how to approach, and how to handle any situation.",
  },
  {
    icon: BarChart3,
    title: "Daily Check-ins & Stats",
    description: "Track your approaches, build streaks, and see your confidence grow over time.",
  },
  {
    icon: Users,
    title: "Community",
    description: "Connect with other guys on the same journey. Share stories, tips, and wins.",
  },
];

const DATA_USAGE = [
  "Google account info (name, email, profile photo) to create and personalize your account",
  "Daily check-in responses to track your progress and build streaks",
  "Chat messages to provide AI coaching (messages are session-only and not permanently stored)",
];

export default function LandingPage() {
  const handleSignIn = () => {
    signInWithGoogle();
  };

  return (
    <main className="min-h-screen max-w-lg mx-auto px-6 pb-16 animate-fade-in">
      {/* Nav */}
      <div className="flex items-center justify-between pt-[max(1.5rem,env(safe-area-inset-top))] mb-16">
        <p className="font-display text-[18px] font-bold tracking-tight">Wingmate</p>
        <button
          onClick={handleSignIn}
          className="text-[14px] font-medium text-text-muted press"
        >
          Sign in
        </button>
      </div>

      {/* Hero */}
      <div className="text-center mb-16">
        <h1 className="font-display text-[38px] font-extrabold tracking-tight leading-[1.1] mb-5">
          Your AI wingmate for cold approaches.
        </h1>
        <p className="text-text-muted text-[16px] leading-relaxed max-w-[380px] mx-auto mb-8">
          Get real-time coaching, track your progress, and build the confidence to go talk to her.
        </p>
        <button
          onClick={handleSignIn}
          className="bg-[#1a1a1a] text-white py-3.5 px-10 rounded-2xl font-semibold text-[15px] press"
        >
          Get started free
        </button>
        <p className="text-text-muted text-[13px] mt-3">No credit card required</p>
      </div>

      {/* What Wingmate does */}
      <div className="mb-16">
        <h2 className="font-display text-[24px] font-bold tracking-tight mb-2">
          What Wingmate does
        </h2>
        <p className="text-text-muted text-[15px] leading-relaxed mb-8">
          Everything you need to get better at approaching — in one app.
        </p>
        <div className="space-y-5 stagger">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex gap-4 bg-bg-card border border-border rounded-2xl p-5">
              <div className="w-10 h-10 rounded-xl bg-bg-input flex items-center justify-center shrink-0">
                <f.icon size={20} strokeWidth={1.5} className="text-text" />
              </div>
              <div>
                <h3 className="font-display text-[16px] font-bold mb-1">{f.title}</h3>
                <p className="text-text-muted text-[14px] leading-relaxed">{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How your data is used */}
      <div className="mb-16">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-bg-input flex items-center justify-center shrink-0">
            <Shield size={20} strokeWidth={1.5} className="text-text" />
          </div>
          <h2 className="font-display text-[24px] font-bold tracking-tight">
            Your data, your control
          </h2>
        </div>
        <p className="text-text-muted text-[15px] leading-relaxed mb-6">
          Wingmate requests access to your Google account to sign you in. Here&apos;s exactly what we use and why:
        </p>
        <div className="space-y-3">
          {DATA_USAGE.map((item) => (
            <div key={item} className="flex gap-3">
              <Check size={16} strokeWidth={2.5} className="text-[#1a1a1a] shrink-0 mt-0.5" />
              <p className="text-[14px] leading-relaxed">{item}</p>
            </div>
          ))}
        </div>
        <p className="text-text-muted text-[14px] leading-relaxed mt-6">
          We never sell your data. You can delete your account and all associated data at any time.
          Read our{" "}
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>{" "}
          for full details.
        </p>
      </div>

      {/* CTA */}
      <div className="text-center mb-16">
        <h2 className="font-display text-[24px] font-bold tracking-tight mb-3">
          Ready to make a move?
        </h2>
        <p className="text-text-muted text-[15px] leading-relaxed mb-8 max-w-[320px] mx-auto">
          View check-ins and stats for free. Upgrade to Pro for unlimited AI coaching.
        </p>
        <button
          onClick={handleSignIn}
          className="bg-[#1a1a1a] text-white py-3.5 px-10 rounded-2xl font-semibold text-[15px] press"
        >
          Get started free
        </button>
      </div>

      {/* Footer */}
      <div className="text-center text-[13px] text-text-muted border-t border-border pt-6">
        <p className="mb-3">Wingmate &middot; AI-powered confidence coaching</p>
        <div className="flex items-center justify-center gap-4 mb-4">
          <Link href="/privacy" className="underline">Privacy Policy</Link>
          <Link href="/terms" className="underline">Terms of Service</Link>
          <Link href="/pricing" className="underline">Pricing</Link>
        </div>
        <p className="text-text-muted/50 text-[12px]">A Keugene Lee production</p>
      </div>
    </main>
  );
}
