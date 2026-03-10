"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Check, CreditCard, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";

type Subscription = {
  status: string;
  price_id: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
} | null;

const FAQ = [
  {
    q: "Can I try it for free?",
    a: "You're already using it! Streaks, approach tracking, community — all free forever. Upgrade for unlimited AI coaching and photo analysis.",
  },
  {
    q: "How is this different from ChatGPT?",
    a: "Wingmate is purpose-built for approaching. It reads photos of your situation, gives you exact openers for that moment, and tracks your progress over time.",
  },
  {
    q: "Can I cancel anytime?",
    a: "One tap. No questions asked. You keep access until the end of your billing period.",
  },
];

export default function PlansPage() {
  const router = useRouter();
  const [subscription, setSubscription] = useState<Subscription>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [billing, setBilling] = useState<"yearly" | "monthly">("yearly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/stripe/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.subscription) setSubscription(data.subscription);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

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

  const handleManageBilling = async () => {
    setLoadingPortal(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setLoadingPortal(false);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  const isActive = subscription?.status === "active" || subscription?.status === "trialing";
  const isYearly = subscription?.price_id?.includes("yearly") || subscription?.price_id?.includes("year");

  if (!loaded) return null;

  const price = billing === "yearly" ? 10 : 15;

  return (
    <main className="min-h-screen max-w-lg mx-auto px-6 pb-24 animate-fade-in">
      {/* Nav */}
      <div className="flex items-center gap-3 pt-6 mb-16">
        <button onClick={() => router.back()} className="p-1 -ml-1 press">
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>
      </div>

      {/* Active subscriber banner */}
      {isActive && (
        <div className="bg-bg-card border border-border rounded-2xl p-5 mb-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-[14px] font-semibold">Wingmate Pro</span>
            </div>
            <span className="text-[12px] text-text-muted font-medium">
              {isYearly ? "$10/mo · Yearly" : "$15/mo · Monthly"}
            </span>
          </div>
          <p className="text-text-muted text-[13px] mb-4">
            {subscription?.cancel_at_period_end
              ? `Your plan cancels ${formatDate(subscription.current_period_end)}`
              : `Renews ${formatDate(subscription!.current_period_end)}`}
          </p>
          <button
            onClick={handleManageBilling}
            disabled={loadingPortal}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-bg-input text-[14px] font-semibold press disabled:opacity-60"
          >
            <CreditCard size={16} strokeWidth={1.5} className="text-text-muted" />
            {loadingPortal ? "Redirecting..." : "Manage billing"}
          </button>
        </div>
      )}

      {/* Hero */}
      <div className="text-center mb-12">
        <h1 className="font-display text-[36px] font-extrabold tracking-tight leading-[1.1] mb-4">
          {isActive ? "Your plan" : "Start for free."}
        </h1>
        <p className="text-text-muted text-[16px] leading-relaxed max-w-[380px] mx-auto">
          {isActive
            ? "You have unlimited access to all Pro features."
            : "Build confidence with daily check-ins and approach tracking. Upgrade when you want unlimited AI coaching."}
        </p>
      </div>

      {/* Billing toggle — hide for active subscribers */}
      {!isActive && (
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
      )}

      {/* Pricing cards — stacked full width */}
      <div className="space-y-4 mb-16">
        {/* Starter */}
        <div className={`bg-bg-card rounded-2xl p-6 ${
          !isActive ? "border-2 border-[#1a1a1a]" : "border border-border"
        } relative`}>
          {!isActive && (
            <span className="absolute -top-3 left-6 bg-[#1a1a1a] text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
              Current plan
            </span>
          )}
          <div className={`flex items-start justify-between ${!isActive ? "mt-1" : ""} mb-6`}>
            <div>
              <h3 className="font-display text-[18px] font-bold mb-1">Starter</h3>
              <p className="text-text-muted text-[14px]">All the essentials to get started</p>
            </div>
            <span className="font-display text-[28px] font-extrabold">Free</span>
          </div>
          <div className="space-y-3">
            {["3 AI coaching sessions per day", "Daily check-ins & streaks", "Approach tracking & stats", "Community feed"].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <Check size={16} strokeWidth={2.5} className="text-text-muted shrink-0" />
                <span className="text-[14px]">{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pro */}
        <div className={`bg-bg-card rounded-2xl p-6 relative ${
          isActive ? "border-2 border-[#1a1a1a]" : "border border-border"
        }`}>
          {isActive && (
            <span className="absolute -top-3 left-6 bg-[#1a1a1a] text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
              Current plan
            </span>
          )}
          <div className={`flex items-start justify-between ${isActive ? "mt-1" : ""} mb-2`}>
            <div>
              <h3 className="font-display text-[18px] font-bold mb-1">Pro</h3>
              <p className="text-text-muted text-[14px]">Unlimited AI coaching & analysis</p>
            </div>
            <div className="text-right">
              <div className="flex items-baseline gap-1.5">
                {!isActive && billing === "yearly" && (
                  <span className="text-text-muted text-[18px] font-bold line-through">$15</span>
                )}
                <span className="font-display text-[28px] font-extrabold">
                  {isActive ? `$${isYearly ? "10" : "15"}` : `$${price}`}
                </span>
                <span className="text-text-muted text-[14px] font-medium">/mo</span>
              </div>
            </div>
          </div>
          <p className="text-text-muted text-[12px] mb-6">
            {isActive
              ? isYearly ? "$120 billed annually" : "Billed monthly"
              : billing === "yearly" ? "$120 billed annually" : "Cancel anytime"}
          </p>
          {!isActive && (
            <button
              onClick={() => handleCheckout(billing)}
              disabled={!!loading}
              className="w-full bg-[#1a1a1a] text-white py-3 rounded-xl font-semibold text-[14px] press disabled:opacity-60 mb-6"
            >
              {loading ? "Redirecting..." : "Subscribe"}
            </button>
          )}
          <p className="text-[12px] font-semibold text-text-muted uppercase tracking-wide mb-3">
            Everything in Starter, plus
          </p>
          <div className="space-y-3">
            {["Unlimited AI coaching sessions", "Photo situation analysis", "Personalized openers for any moment", "Text & DM coaching", "Dating profile reviews"].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <Check size={16} strokeWidth={2.5} className="text-[#1a1a1a] shrink-0" />
                <span className="text-[14px]">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom CTA — only for non-subscribers */}
      {!isActive && (
        <div className="text-center mb-16">
          <h2 className="font-display text-[24px] font-bold tracking-tight mb-3">
            Your AI wingman, always ready.
          </h2>
          <p className="text-text-muted text-[15px] leading-relaxed mb-8 max-w-[320px] mx-auto">
            Try Wingmate Pro on your next approach.
          </p>
          <button
            onClick={() => handleCheckout(billing)}
            disabled={!!loading}
            className="bg-[#1a1a1a] text-white py-3.5 px-12 rounded-2xl font-semibold text-[15px] press disabled:opacity-60"
          >
            {loading ? "Redirecting..." : "Get Wingmate Pro"}
          </button>
        </div>
      )}

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
      </div>

      <BottomNav />
    </main>
  );
}
