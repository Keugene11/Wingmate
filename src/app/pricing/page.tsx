"use client";

import { useState } from "react";
import { Check, X, ChevronDown, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PRO_FEATURES = [
  "Unlimited AI coaching sessions",
  "Photo situation analysis",
  "Personalized approach openers",
  "Text & DM conversation coaching",
  "Dating profile reviews",
  "Situational game plans",
];

const FREE_FEATURES = [
  "Daily check-ins & streaks",
  "XP, levels & badges",
  "Weekly competitive leagues",
  "Community feed access",
  "3 AI coaching sessions per day",
];

const FAQ = [
  {
    q: "Can I try it for free?",
    a: "Absolutely. Streaks, badges, leagues, community — all free forever. You also get 3 AI coaching sessions per day. Upgrade only when you want more.",
  },
  {
    q: "How is this different from ChatGPT?",
    a: "Wingmate is built for one thing: helping you approach. It reads photos of your situation, gives you exact openers for that moment, and tracks your confidence growth over time. No generic advice.",
  },
  {
    q: "Are my photos private?",
    a: "Your photos never leave your device. They're analyzed locally and never uploaded or stored. Chat sessions aren't saved after they end.",
  },
  {
    q: "Can I cancel anytime?",
    a: "One tap. No questions, no hoops. You keep access until the end of your billing period.",
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
      {/* Back */}
      <div className="pt-6 mb-4">
        <button onClick={() => router.back()} className="p-1 -ml-1 press">
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>
      </div>

      {/* Hero — big, bold, emotional */}
      <div className="text-center mb-12 animate-slide-up">
        <p className="text-[13px] font-semibold tracking-widest uppercase text-text-muted mb-4">
          Wingmate Pro
        </p>
        <h1 className="font-display text-[34px] font-extrabold tracking-tight leading-[1.05] mb-4">
          You already know<br />what to do.<br />
          <span className="text-text-muted">Now actually do it.</span>
        </h1>
        <p className="text-text-muted text-[15px] leading-relaxed max-w-[300px] mx-auto">
          Unlimited AI coaching. Photo analysis. Zero excuses left.
        </p>
      </div>

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <button
          onClick={() => setBilling("monthly")}
          className={`text-[14px] font-medium transition-colors ${
            billing === "monthly" ? "text-text" : "text-text-muted/50"
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBilling(billing === "yearly" ? "monthly" : "yearly")}
          className={`relative w-12 h-7 rounded-full transition-colors ${
            billing === "yearly" ? "bg-[#1a1a1a]" : "bg-border"
          }`}
        >
          <div
            className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${
              billing === "yearly" ? "left-[calc(100%-1.625rem)]" : "left-0.5"
            }`}
          />
        </button>
        <button
          onClick={() => setBilling("yearly")}
          className={`text-[14px] font-medium transition-colors ${
            billing === "yearly" ? "text-text" : "text-text-muted/50"
          }`}
        >
          Yearly
          <span className="ml-1.5 text-[11px] font-bold text-green-600">-33%</span>
        </button>
      </div>

      {/* Price display */}
      <div className="text-center mb-2">
        <div className="flex items-baseline justify-center gap-1">
          <span className="font-display text-[56px] font-extrabold leading-none tracking-tight">
            ${price}
          </span>
          <span className="text-text-muted text-[18px] font-medium">/mo</span>
        </div>
        {billing === "yearly" ? (
          <p className="text-text-muted text-[14px] mt-2">
            $120/year &middot; <span className="text-green-600 font-semibold">saves $60</span>
          </p>
        ) : (
          <p className="text-text-muted text-[14px] mt-2">Billed monthly &middot; cancel anytime</p>
        )}
      </div>

      {/* CTA */}
      <button
        onClick={() => handleCheckout(billing)}
        disabled={!!loading}
        className="w-full bg-[#1a1a1a] text-white py-4 rounded-2xl font-semibold text-[16px] press disabled:opacity-60 mt-6 mb-2"
      >
        {loading ? "Redirecting..." : "Get Wingmate Pro"}
      </button>
      <p className="text-center text-[12px] text-text-muted mb-12">
        7-day money-back guarantee &middot; Cancel anytime
      </p>

      {/* What you unlock */}
      <div className="mb-12">
        <h2 className="font-display text-[13px] font-bold tracking-widest uppercase text-text-muted mb-5">
          What you unlock
        </h2>
        <div className="space-y-4">
          {PRO_FEATURES.map((f) => (
            <div key={f} className="flex items-start gap-3.5">
              <div className="w-5 h-5 rounded-full bg-[#1a1a1a] flex items-center justify-center shrink-0 mt-0.5">
                <Check size={12} strokeWidth={3} className="text-white" />
              </div>
              <span className="text-[15px] font-medium leading-snug">{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* What's already free */}
      <div className="mb-12">
        <h2 className="font-display text-[13px] font-bold tracking-widest uppercase text-text-muted mb-5">
          Already free
        </h2>
        <div className="space-y-4">
          {FREE_FEATURES.map((f) => (
            <div key={f} className="flex items-start gap-3.5">
              <div className="w-5 h-5 rounded-full bg-bg-input flex items-center justify-center shrink-0 mt-0.5">
                <Check size={12} strokeWidth={3} className="text-text-muted" />
              </div>
              <span className="text-[15px] text-text-muted leading-snug">{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* The pitch — full bleed dark */}
      <div className="bg-[#1a1a1a] text-white rounded-3xl px-6 py-8 mb-12 text-center">
        <p className="font-display text-[22px] font-bold leading-snug mb-3">
          Remember the last time you didn&apos;t go talk to them?
        </p>
        <p className="text-white/50 text-[14px] leading-relaxed mb-6 max-w-[280px] mx-auto">
          That feeling of &ldquo;I should have&rdquo; costs way more than ${price}/mo. Don&apos;t let it happen again.
        </p>
        <button
          onClick={() => handleCheckout(billing)}
          disabled={!!loading}
          className="bg-white text-[#1a1a1a] py-3.5 px-8 rounded-2xl font-semibold text-[15px] press disabled:opacity-60"
        >
          {loading ? "Redirecting..." : "Start now"}
        </button>
      </div>

      {/* FAQ */}
      <div className="mb-12">
        <h2 className="font-display text-[13px] font-bold tracking-widest uppercase text-text-muted mb-5">
          Questions
        </h2>
        <div className="space-y-2">
          {FAQ.map((item, i) => (
            <button
              key={i}
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              className="w-full text-left press"
            >
              <div className="flex items-start justify-between gap-4 py-3.5 border-b border-border">
                <div className="flex-1">
                  <p className="font-medium text-[15px] leading-snug">{item.q}</p>
                  {openFaq === i && (
                    <p className="text-text-muted text-[14px] leading-relaxed mt-2 pr-4">
                      {item.a}
                    </p>
                  )}
                </div>
                <ChevronDown
                  size={18}
                  strokeWidth={1.5}
                  className={`text-text-muted shrink-0 mt-0.5 transition-transform ${
                    openFaq === i ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom */}
      <div className="text-center pb-4">
        <p className="text-[12px] text-text-muted">
          Secure payment via Stripe
        </p>
        <p className="text-[13px] text-text-muted mt-3">
          Already have an account?{" "}
          <Link href="/login" className="underline font-medium text-text">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
