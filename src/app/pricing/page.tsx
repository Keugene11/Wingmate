"use client";

import { useState } from "react";
import { Check, Minus, ChevronDown, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const COMPARISON = [
  { feature: "AI coaching messages", free: "2 messages", pro: "Unlimited" },
  { feature: "Daily check-ins & streaks", free: "View only", pro: true },
  { feature: "Approach tracking & stats", free: "View only", pro: true },
  { feature: "Community posts & comments", free: false, pro: true },
  { feature: "Community search", free: false, pro: true },
  { feature: "User post histories", free: false, pro: true },
];

const FAQ = [
  {
    q: "Can I try it for free?",
    a: "Yes. You can see the tracker and stats, and get 2 free AI coaching messages to try it out. Upgrade for unlimited coaching, full tracker access, and community.",
  },
  {
    q: "How is this different from ChatGPT?",
    a: "Wingmate is purpose-built for approaching. It gives you exact openers, tracks your progress over time, and keeps you accountable with daily check-ins. No generic advice.",
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
    <main className="min-h-screen max-w-lg mx-auto px-6 pb-20 animate-fade-in">
      {/* Nav */}
      <div className="flex items-center justify-between pt-6 mb-16">
        <button onClick={() => router.back()} className="p-1 -ml-1 press">
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>
        <Link href="/" className="text-[14px] font-medium text-text-muted press">
          Sign in
        </Link>
      </div>

      {/* Hero */}
      <div className="text-center mb-12">
        <h1 className="font-display text-[36px] font-extrabold tracking-tight leading-[1.1] mb-4">
          Start for free.
        </h1>
        <p className="text-text-muted text-[16px] leading-relaxed max-w-[380px] mx-auto">
          Build confidence with daily check-ins and approach tracking. Upgrade when you want unlimited AI coaching.
        </p>
      </div>

      {/* Billing toggle */}
      <div className="flex items-center justify-center mb-10">
        <div className="bg-bg-card border border-border rounded-full p-1 flex">
          <button
            onClick={() => setBilling("monthly")}
            className={`px-6 py-2.5 rounded-full text-[14px] font-semibold transition-colors ${
              billing === "monthly" ? "bg-[#1a1a1a] text-white" : "text-text-muted"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("yearly")}
            className={`px-6 py-2.5 rounded-full text-[14px] font-semibold transition-colors relative ${
              billing === "yearly" ? "bg-[#1a1a1a] text-white" : "text-text-muted"
            }`}
          >
            Annually
            <span className={`absolute -top-2.5 -right-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
              billing === "yearly" ? "bg-green-500 text-white" : "bg-green-100 text-green-700"
            }`}>
              -33%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing cards — stacked full width */}
      <div className="space-y-4 mb-16">
        {/* Starter */}
        <div className="bg-bg-card border border-border rounded-2xl p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="font-display text-[18px] font-bold mb-1">Starter</h3>
              <p className="text-text-muted text-[14px]">All the essentials to get started</p>
            </div>
            <span className="font-display text-[28px] font-extrabold">Free</span>
          </div>
          <Link
            href="/"
            className="w-full bg-bg-input text-text py-3 rounded-xl font-semibold text-[14px] press text-center block mb-6"
          >
            Get started
          </Link>
          <div className="space-y-3">
            {["2 free AI coaching messages", "View check-ins & stats"].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <Check size={16} strokeWidth={2.5} className="text-text-muted shrink-0" />
                <span className="text-[14px]">{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pro */}
        <div className="bg-bg-card border-2 border-[#1a1a1a] rounded-2xl p-6 relative">
          <span className="absolute -top-3 left-6 bg-[#1a1a1a] text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
            Most popular
          </span>
          <div className="flex items-start justify-between mb-2 mt-1">
            <div>
              <h3 className="font-display text-[18px] font-bold mb-1">Pro</h3>
              <p className="text-text-muted text-[14px]">Unlimited AI coaching & analysis</p>
            </div>
            <div className="text-right">
              <div className="flex items-baseline gap-1.5">
                {billing === "yearly" && (
                  <span className="text-text-muted text-[18px] font-bold line-through">$15</span>
                )}
                <span className="font-display text-[28px] font-extrabold">${price}</span>
                <span className="text-text-muted text-[14px] font-medium">/mo</span>
              </div>
            </div>
          </div>
          <p className="text-text-muted text-[12px] mb-6">
            {billing === "yearly" ? "$120 billed annually" : "Cancel anytime"}
          </p>
          <button
            onClick={() => handleCheckout(billing)}
            disabled={!!loading}
            className="w-full bg-[#1a1a1a] text-white py-3 rounded-xl font-semibold text-[14px] press disabled:opacity-60 mb-6"
          >
            {loading ? "Redirecting..." : "Subscribe"}
          </button>
          <p className="text-[12px] font-semibold text-text-muted uppercase tracking-wide mb-3">
            Everything in Starter, plus
          </p>
          <div className="space-y-3">
            {["Unlimited AI coaching", "Daily check-ins & streaks", "Approach tracking & stats", "Community posts & comments"].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <Check size={16} strokeWidth={2.5} className="text-[#1a1a1a] shrink-0" />
                <span className="text-[14px]">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Feature comparison table */}
      <div className="mb-16">
        <h2 className="font-display text-[22px] font-bold tracking-tight mb-6">
          Compare plans
        </h2>

        <div className="rounded-2xl border border-border overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr,80px,80px] bg-bg-input/50">
            <div className="px-5 py-3.5">
              <span className="text-[12px] font-semibold text-text-muted uppercase tracking-wide">Feature</span>
            </div>
            <div className="px-2 py-3.5 text-center">
              <span className="text-[12px] font-semibold text-text-muted uppercase tracking-wide">Starter</span>
            </div>
            <div className="px-2 py-3.5 text-center">
              <span className="text-[12px] font-bold text-text uppercase tracking-wide">Pro</span>
            </div>
          </div>

          {/* Rows */}
          {COMPARISON.map((row, i) => (
            <div
              key={row.feature}
              className={`grid grid-cols-[1fr,80px,80px] ${
                i < COMPARISON.length - 1 ? "border-b border-border/50" : ""
              }`}
            >
              <div className="px-5 py-3.5 flex items-center">
                <span className="text-[13px]">{row.feature}</span>
              </div>
              <div className="px-2 py-3.5 flex items-center justify-center">
                {row.free === true ? (
                  <Check size={16} strokeWidth={2.5} className="text-text-muted" />
                ) : row.free === false ? (
                  <Minus size={16} strokeWidth={2} className="text-border" />
                ) : (
                  <span className="text-[11px] text-text-muted font-medium">{row.free}</span>
                )}
              </div>
              <div className="px-2 py-3.5 flex items-center justify-center">
                {row.pro === true ? (
                  <Check size={16} strokeWidth={2.5} className="text-[#1a1a1a]" />
                ) : (
                  <span className="text-[11px] font-semibold">{row.pro}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="text-center mb-16">
        <h2 className="font-display text-[24px] font-bold tracking-tight mb-3">
          Your AI wingmate, always ready.
        </h2>
        <p className="text-text-muted text-[15px] leading-relaxed mb-8 max-w-[320px] mx-auto">
          Try Wingmate on your next approach today.
        </p>
        <button
          onClick={() => handleCheckout(billing)}
          disabled={!!loading}
          className="bg-[#1a1a1a] text-white py-3.5 px-12 rounded-2xl font-semibold text-[15px] press disabled:opacity-60"
        >
          {loading ? "Redirecting..." : "Get Wingmate Pro"}
        </button>
      </div>

      {/* FAQ */}
      <div className="mb-16">
        <h2 className="font-display text-[22px] font-bold tracking-tight mb-6">
          Frequently asked questions
        </h2>
        <div className="rounded-2xl border border-border overflow-hidden">
          {FAQ.map((item, i) => (
            <button
              key={i}
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              className="w-full text-left press"
            >
              <div className={`flex items-start justify-between gap-4 px-5 py-4.5 ${
                i < FAQ.length - 1 ? "border-b border-border/50" : ""
              }`}>
                <div className="flex-1">
                  <p className="font-semibold text-[14px] leading-snug">{item.q}</p>
                  {openFaq === i && (
                    <p className="text-text-muted text-[14px] leading-relaxed mt-3">
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
      <div className="text-center text-[13px] text-text-muted pb-6">
        <p>Secure payment via Stripe &middot; Cancel anytime</p>
        <div className="flex items-center justify-center gap-4 mt-3">
          <Link href="/privacy" className="underline">Privacy Policy</Link>
          <Link href="/" className="underline">Sign in</Link>
        </div>
      </div>
    </main>
  );
}
