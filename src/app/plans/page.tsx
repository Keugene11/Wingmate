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
    a: "You get 1 free coaching session to try it out. Upgrade to Pro for unlimited AI coaching, community access, and the full approach tracker.",
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

export default function PlansPage() {
  const router = useRouter();
  const [subscription, setSubscription] = useState<Subscription>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  useEffect(() => {
    fetch("/api/stripe/status")
      .then((res) => {
        if (res.ok) setIsLoggedIn(true);
        return res.json();
      })
      .then((data) => {
        if (data.subscription) setSubscription(data.subscription);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async (plan: "monthly" | "yearly") => {
    setLoading(plan);
    setError(null);

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
      setError(data.error || "Something went wrong. Please try again.");
    } catch {
      setError("Network error — check your connection.");
    }
    setLoading(null);
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

  return (
    <main className="min-h-screen max-w-lg mx-auto px-6 pb-24 animate-fade-in">
      {/* Nav */}
      <div className="flex items-center gap-3 pt-6 mb-16">
        <button onClick={() => router.back()} className="p-1 -ml-1 press">
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>
      </div>

      {/* Hero */}
      <div className="text-center mb-12">
        <h1 className="font-display text-[36px] font-extrabold tracking-tight leading-[1.1] mb-4">
          {isActive ? "Your plan" : "Start for free."}
        </h1>
        <p className="text-text-muted text-[16px] leading-relaxed max-w-[380px] mx-auto">
          {isActive
            ? "You have unlimited access to all Pro features."
            : "Unlimited AI coaching, community access, and the full approach tracker."}
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-center mb-6">
          <p className="text-[14px] font-medium text-red-700">{error}</p>
        </div>
      )}

      {/* Pricing cards */}
      <div className="space-y-4 mb-16">
        {/* Active subscriber banner */}
        {isActive && (
          <div className="bg-bg-card border-2 border-[#1a1a1a] rounded-2xl p-5 relative">
            <span className="absolute -top-3 left-6 bg-[#1a1a1a] text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
              Current plan
            </span>
            <div className="flex items-center justify-between mt-1 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-[14px] font-semibold">Wingmate Pro · {isYearly ? "Yearly" : "Monthly"}</span>
              </div>
              <span className="text-[14px] font-bold">${isYearly ? "15" : "20"}/mo</span>
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

        {/* Monthly Pro */}
        <div className="bg-bg-card border border-border rounded-2xl shadow-card p-6">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-display text-[18px] font-bold mb-1">Pro Monthly</h3>
              <p className="text-text-muted text-[14px]">Unlimited AI coaching & analysis</p>
            </div>
            <div className="text-right">
              <div className="flex items-baseline gap-1.5">
                <span className="font-display text-[28px] font-extrabold">$20</span>
                <span className="text-text-muted text-[14px] font-medium">/mo</span>
              </div>
            </div>
          </div>
          <p className="text-text-muted text-[12px] mb-5">Cancel anytime</p>
          {!isActive && (
            isLoggedIn ? (
              <button
                onClick={() => handleCheckout("monthly")}
                disabled={!!loading}
                className="w-full bg-bg-input text-text py-3 rounded-xl font-semibold text-[14px] press disabled:opacity-60 mb-5"
              >
                {loading === "monthly" ? "Redirecting..." : "Subscribe monthly"}
              </button>
            ) : (
              <a
                href="/api/auth/login"
                onClick={() => localStorage.setItem("pending-checkout-plan", "monthly")}
                className="block w-full bg-bg-input text-text py-3 rounded-xl font-semibold text-[14px] press text-center mb-5"
              >
                Subscribe monthly
              </a>
            )
          )}
          <div className="space-y-3">
            {["Unlimited AI coaching", "Approach tracker & stats", "Daily check-ins & streaks", "Community access"].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <Check size={16} strokeWidth={2.5} className="text-text-muted shrink-0" />
                <span className="text-[14px]">{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Yearly Pro */}
        <div className="bg-bg-card border-2 border-[#1a1a1a] rounded-2xl p-6 relative">
          <span className="absolute -top-3 left-6 bg-green-500 text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
            Save 25%
          </span>
          <div className="flex items-start justify-between mt-1 mb-2">
            <div>
              <h3 className="font-display text-[18px] font-bold mb-1">Pro Yearly</h3>
              <p className="text-text-muted text-[14px]">Unlimited AI coaching & analysis</p>
            </div>
            <div className="text-right">
              <div className="flex items-baseline gap-1.5">
                <span className="text-text-muted text-[18px] font-bold line-through">$20</span>
                <span className="font-display text-[28px] font-extrabold">$15</span>
                <span className="text-text-muted text-[14px] font-medium">/mo</span>
              </div>
            </div>
          </div>
          <p className="text-text-muted text-[12px] mb-5">$180 billed annually</p>
          {!isActive && (
            isLoggedIn ? (
              <button
                onClick={() => handleCheckout("yearly")}
                disabled={!!loading}
                className="w-full bg-[#1a1a1a] text-white py-3 rounded-xl font-semibold text-[14px] press disabled:opacity-60 mb-5"
              >
                {loading === "yearly" ? "Redirecting..." : "Subscribe yearly"}
              </button>
            ) : (
              <a
                href="/api/auth/login"
                onClick={() => localStorage.setItem("pending-checkout-plan", "yearly")}
                className="block w-full bg-[#1a1a1a] text-white py-3 rounded-xl font-semibold text-[14px] press text-center mb-5"
              >
                Subscribe yearly
              </a>
            )
          )}
          <div className="space-y-3">
            {["Unlimited AI coaching", "Approach tracker & stats", "Daily check-ins & streaks", "Community access"].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <Check size={16} strokeWidth={2.5} className="text-[#1a1a1a] shrink-0" />
                <span className="text-[14px]">{f}</span>
              </div>
            ))}
          </div>
        </div>
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
      </div>

      <BottomNav />
    </main>
  );
}
