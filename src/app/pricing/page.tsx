"use client";

import { useState } from "react";
import { Check, Minus, ChevronDown, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const COMPARISON = [
  { feature: "AI coaching sessions", free: "3 / day", pro: "Unlimited" },
  { feature: "Photo situation analysis", free: false, pro: true },
  { feature: "Personalized openers", free: false, pro: true },
  { feature: "Text & DM coaching", free: false, pro: true },
  { feature: "Dating profile reviews", free: false, pro: true },
  { feature: "Custom approach plans", free: false, pro: true },
  { feature: "Daily check-ins", free: true, pro: true },
  { feature: "Streaks, XP & levels", free: true, pro: true },
  { feature: "Badges & achievements", free: true, pro: true },
  { feature: "Weekly leagues", free: true, pro: true },
  { feature: "Community feed", free: true, pro: true },
];

const FAQ = [
  {
    q: "Can I try it for free?",
    a: "Yes. Streaks, badges, leagues, community — all free forever. You also get 3 AI coaching sessions per day. Upgrade only when you want unlimited access.",
  },
  {
    q: "How is this different from ChatGPT?",
    a: "Wingmate is purpose-built for approaching. It reads photos of your situation, gives you exact openers for that moment, and tracks your progress over time. No generic advice.",
  },
  {
    q: "Are my photos private?",
    a: "Photos never leave your device. They're analyzed locally and never uploaded. Chat sessions aren't saved after they end.",
  },
  {
    q: "Can I cancel anytime?",
    a: "One tap. No questions asked. You keep access until the end of your billing period.",
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [billing, setBilling] = useState<"yearly" | "monthly">("yearly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleCheckout = async (plan: "monthly" | "yearly") => {
    setLoading(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setLoading(null);
    }
  };

  const price = billing === "yearly" ? 10 : 15;

  return (
    <main className="min-h-screen max-w-md mx-auto px-5 pb-16 animate-fade-in">
      {/* Nav */}
      <div className="flex items-center justify-between pt-6 mb-10">
        <button onClick={() => router.back()} className="p-1 -ml-1 press">
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>
        <Link href="/login" className="text-[14px] font-medium text-text-muted press">
          Sign in
        </Link>
      </div>

      {/* Hero */}
      <div className="text-center mb-10 animate-slide-up">
        <h1 className="font-display text-[32px] font-extrabold tracking-tight leading-[1.1] mb-3">
          Start for free.
        </h1>
        <p className="text-text-muted text-[15px] leading-relaxed max-w-[340px] mx-auto">
          Whether you&apos;re building a streak, reviewing a situation, or need a push before approaching — it&apos;s free to start.
        </p>
      </div>

      {/* Billing toggle */}
      <div className="flex items-center justify-center mb-6">
        <div className="bg-bg-card border border-border rounded-full p-1 flex">
          <button
            onClick={() => setBilling("monthly")}
            className={`px-5 py-2 rounded-full text-[13px] font-semibold transition-colors ${
              billing === "monthly" ? "bg-[#1a1a1a] text-white" : "text-text-muted"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("yearly")}
            className={`px-5 py-2 rounded-full text-[13px] font-semibold transition-colors relative ${
              billing === "yearly" ? "bg-[#1a1a1a] text-white" : "text-text-muted"
            }`}
          >
            Annually
            {billing === "yearly" && (
              <span className="absolute -top-2 -right-1 text-[9px] font-bold bg-green-500 text-white px-1.5 py-0.5 rounded-full">
                -33%
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Pricing cards */}
      <div className="grid grid-cols-2 gap-3 mb-12 stagger">
        {/* Free */}
        <div className="bg-bg-card border border-border rounded-2xl px-4 py-5 flex flex-col">
          <p className="text-[12px] font-semibold text-text-muted uppercase tracking-wide mb-1">
            Starter
          </p>
          <p className="text-text-muted text-[12px] mb-4 leading-snug">
            All the essentials
          </p>
          <div className="flex items-baseline gap-0.5 mb-4">
            <span className="font-display text-[32px] font-extrabold leading-none">Free</span>
          </div>
          <Link
            href="/login"
            className="w-full bg-bg-input text-text py-2.5 rounded-xl font-semibold text-[13px] press text-center block mb-5"
          >
            Get started
          </Link>
          <div className="space-y-2.5 mt-auto">
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wide mb-1">Includes</p>
            {["3 AI sessions/day", "Check-ins & streaks", "XP & badges", "Community feed", "Weekly leagues"].map((f) => (
              <div key={f} className="flex items-center gap-2">
                <Check size={13} strokeWidth={2.5} className="text-text-muted shrink-0" />
                <span className="text-[12px] leading-snug">{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pro */}
        <div className="bg-[#1a1a1a] text-white rounded-2xl px-4 py-5 flex flex-col relative">
          <p className="text-[12px] font-semibold text-white/50 uppercase tracking-wide mb-1">
            Pro
          </p>
          <p className="text-white/40 text-[12px] mb-4 leading-snug">
            Unlimited everything
          </p>
          <div className="flex items-baseline gap-1.5 mb-1">
            {billing === "yearly" && (
              <span className="text-white/30 text-[18px] font-bold line-through">$15</span>
            )}
            <span className="font-display text-[32px] font-extrabold leading-none">${price}</span>
            <span className="text-white/40 text-[14px] font-medium">/mo</span>
          </div>
          <p className="text-white/30 text-[11px] mb-3">
            {billing === "yearly" ? "$120 billed yearly" : "Cancel anytime"}
          </p>
          <button
            onClick={() => handleCheckout(billing)}
            disabled={!!loading}
            className="w-full bg-white text-[#1a1a1a] py-2.5 rounded-xl font-semibold text-[13px] press disabled:opacity-60 mb-5"
          >
            {loading ? "..." : "Subscribe"}
          </button>
          <div className="space-y-2.5 mt-auto">
            <p className="text-[11px] font-semibold text-white/30 uppercase tracking-wide mb-1">
              Everything in Starter, plus
            </p>
            {["Unlimited AI sessions", "Photo analysis", "Custom openers", "Text coaching", "Profile reviews"].map((f) => (
              <div key={f} className="flex items-center gap-2">
                <Check size={13} strokeWidth={2.5} className="text-white/70 shrink-0" />
                <span className="text-[12px] text-white/80 leading-snug">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Feature comparison table */}
      <div className="mb-12">
        <h2 className="font-display text-[18px] font-bold tracking-tight mb-4">
          Compare plans
        </h2>

        <div className="rounded-2xl border border-border overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr,72px,72px] bg-bg-input/60">
            <div className="px-4 py-3">
              <span className="text-[12px] font-semibold text-text-muted uppercase tracking-wide">Feature</span>
            </div>
            <div className="px-2 py-3 text-center">
              <span className="text-[12px] font-semibold text-text-muted uppercase tracking-wide">Starter</span>
            </div>
            <div className="px-2 py-3 text-center bg-[#1a1a1a]/5 rounded-tr-xl">
              <span className="text-[12px] font-semibold text-text uppercase tracking-wide">Pro</span>
            </div>
          </div>

          {/* Rows */}
          {COMPARISON.map((row, i) => (
            <div
              key={row.feature}
              className={`grid grid-cols-[1fr,72px,72px] ${
                i < COMPARISON.length - 1 ? "border-b border-border/60" : ""
              } ${i % 2 === 1 ? "bg-bg-input/30" : ""}`}
            >
              <div className="px-4 py-3 flex items-center">
                <span className="text-[13px]">{row.feature}</span>
              </div>
              <div className="px-2 py-3 flex items-center justify-center">
                {row.free === true ? (
                  <Check size={15} strokeWidth={2.5} className="text-text-muted" />
                ) : row.free === false ? (
                  <Minus size={15} strokeWidth={2} className="text-border" />
                ) : (
                  <span className="text-[11px] text-text-muted font-medium">{row.free}</span>
                )}
              </div>
              <div className="px-2 py-3 flex items-center justify-center bg-[#1a1a1a]/[0.02]">
                {row.pro === true ? (
                  <Check size={15} strokeWidth={2.5} className="text-[#1a1a1a]" />
                ) : (
                  <span className="text-[11px] font-semibold">{row.pro}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="text-center mb-12">
        <h2 className="font-display text-[22px] font-bold tracking-tight mb-2">
          Your AI wingman, always ready.
        </h2>
        <p className="text-text-muted text-[14px] leading-relaxed mb-6 max-w-[300px] mx-auto">
          Try Wingmate on your next approach today.
        </p>
        <button
          onClick={() => handleCheckout(billing)}
          disabled={!!loading}
          className="bg-[#1a1a1a] text-white py-3.5 px-10 rounded-2xl font-semibold text-[15px] press disabled:opacity-60"
        >
          {loading ? "Redirecting..." : "Get Wingmate Pro"}
        </button>
      </div>

      {/* FAQ */}
      <div className="mb-12">
        <h2 className="font-display text-[18px] font-bold tracking-tight mb-4">
          Frequently asked questions
        </h2>
        <div>
          {FAQ.map((item, i) => (
            <button
              key={i}
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              className="w-full text-left press"
            >
              <div className={`flex items-start justify-between gap-4 py-4 ${
                i < FAQ.length - 1 ? "border-b border-border" : ""
              }`}>
                <div className="flex-1">
                  <p className="font-medium text-[14px] leading-snug">{item.q}</p>
                  {openFaq === i && (
                    <p className="text-text-muted text-[13px] leading-relaxed mt-2.5 pr-4">
                      {item.a}
                    </p>
                  )}
                </div>
                <ChevronDown
                  size={16}
                  strokeWidth={2}
                  className={`text-text-muted shrink-0 mt-0.5 transition-transform ${
                    openFaq === i ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-[12px] text-text-muted pb-4">
        <p>Secure payment via Stripe &middot; Cancel anytime</p>
        <div className="flex items-center justify-center gap-4 mt-3">
          <Link href="/privacy" className="underline">Privacy Policy</Link>
          <Link href="/login" className="underline">Sign in</Link>
        </div>
      </div>
    </main>
  );
}
