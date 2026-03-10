"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Check, CreditCard, Home } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Subscription = {
  status: string;
  price_id: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
} | null;

export default function PlansPage() {
  const router = useRouter();
  const [subscription, setSubscription] = useState<Subscription>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);

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

  return (
    <main className="min-h-screen max-w-md mx-auto px-5 pt-14 pb-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-text-muted text-[14px] press"
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
          Back
        </button>
        <Link
          href="/"
          className="flex items-center gap-1.5 text-text-muted text-[14px] press"
        >
          <Home size={16} strokeWidth={1.5} />
          Home
        </Link>
      </div>

      <div className="mb-10 animate-slide-up">
        <h1 className="font-display text-[28px] font-extrabold tracking-tight leading-none mb-2">
          {isActive ? "Your Plan" : "Unlock Your Confidence"}
        </h1>
        {isActive && (
          <p className="text-text-muted text-[15px]">
            {subscription?.cancel_at_period_end
              ? `Cancels ${formatDate(subscription.current_period_end)}`
              : `Renews ${formatDate(subscription!.current_period_end)}`}
          </p>
        )}
      </div>

      {!isActive && (
        <div className="mb-8 space-y-4 animate-fade-in" style={{ animationDelay: "100ms" }}>
          <div className="bg-bg-card border border-border rounded-xl px-5 py-4">
            <p className="text-[15px] leading-relaxed">
              If you&apos;re feeling too awkward to even <span className="font-semibold text-primary">snap the pic</span>, how are you going to walk up and talk to them? Taking the photo is your first step — it breaks through that initial wall of fear.
            </p>
          </div>

          <div className="bg-bg-card border border-border rounded-xl px-5 py-4">
            <p className="text-[15px] leading-relaxed">
              Think about how incredible it would be to actually <span className="font-semibold text-primary">approach and connect</span> with that person. That one memorable experience is worth infinitely more than $15.
            </p>
          </div>

          <div className="bg-bg-card border border-border rounded-xl px-5 py-4">
            <p className="text-[15px] leading-relaxed">
              Cold approaching your crush and overcoming your nerves to talk to them is one of the <span className="font-semibold text-primary">most fulfilling experiences</span> of your life — something you&apos;ll remember forever. Don&apos;t let hesitation hold you back.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3 stagger">
        {/* Yearly */}
        <div
          className={`w-full rounded-xl px-5 py-5 text-left relative overflow-hidden ${
            isActive && isYearly
              ? "bg-primary text-white"
              : "bg-bg-card border border-border"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-display font-bold text-[18px] leading-tight">Yearly</p>
                {!(isActive && isYearly) && (
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    isActive ? "bg-bg-input text-text-muted" : "bg-primary/10 text-primary"
                  }`}>
                    SAVE 33%
                  </span>
                )}
                {isActive && isYearly && (
                  <span className="text-[11px] font-semibold bg-white/20 text-white px-2 py-0.5 rounded-full">
                    CURRENT
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1.5 mt-1.5">
                <span className="text-[28px] font-bold leading-none">$10</span>
                <span className={`text-[14px] ${isActive && isYearly ? "text-white/70" : "text-text-muted"}`}>/month</span>
              </div>
              <p className={`text-[13px] mt-1 ${isActive && isYearly ? "text-white/60" : "text-text-muted"}`}>
                $120 billed annually
              </p>
            </div>
            {isActive && isYearly && (
              <Check size={22} strokeWidth={2.5} className="text-white" />
            )}
          </div>
          {!isActive && (
            <button
              onClick={() => handleCheckout("yearly")}
              disabled={!!loading}
              className="mt-4 w-full bg-primary text-white py-3 rounded-lg font-medium text-[14px] press disabled:opacity-60"
            >
              {loading === "yearly" ? "Redirecting..." : "Get Yearly"}
            </button>
          )}
        </div>

        {/* Monthly */}
        <div
          className={`w-full rounded-xl px-5 py-5 text-left relative overflow-hidden ${
            isActive && !isYearly
              ? "bg-primary text-white"
              : "bg-bg-card border border-border"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-display font-bold text-[18px] leading-tight">Monthly</p>
                {isActive && !isYearly && (
                  <span className="text-[11px] font-semibold bg-white/20 text-white px-2 py-0.5 rounded-full">
                    CURRENT
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1.5 mt-1.5">
                <span className="text-[28px] font-bold leading-none">$15</span>
                <span className={`text-[14px] ${isActive && !isYearly ? "text-white/70" : "text-text-muted"}`}>/month</span>
              </div>
              <p className={`text-[13px] mt-1 ${isActive && !isYearly ? "text-white/60" : "text-text-muted"}`}>
                Cancel anytime
              </p>
            </div>
            {isActive && !isYearly && (
              <Check size={22} strokeWidth={2.5} className="text-white" />
            )}
          </div>
          {!isActive && (
            <button
              onClick={() => handleCheckout("monthly")}
              disabled={!!loading}
              className="mt-4 w-full bg-primary text-white py-3 rounded-lg font-medium text-[14px] press disabled:opacity-60"
            >
              {loading === "monthly" ? "Redirecting..." : "Get Monthly"}
            </button>
          )}
        </div>
      </div>

      {/* Features */}
      <div className="mt-8 space-y-3 animate-fade-in" style={{ animationDelay: "200ms" }}>
        <p className="text-[13px] font-semibold text-text-muted uppercase tracking-wide">
          What you get
        </p>
        {[
          "Unlimited AI coaching sessions",
          "Photo scene analysis",
          "Personalized approach strategies",
          "Real-time confidence building",
        ].map((feature) => (
          <div key={feature} className="flex items-center gap-2.5">
            <Check size={16} strokeWidth={2.5} className="text-primary shrink-0" />
            <span className="text-[14px]">{feature}</span>
          </div>
        ))}
      </div>

      {/* Manage Billing */}
      {isActive && (
        <button
          onClick={handleManageBilling}
          disabled={loadingPortal}
          className="flex items-center gap-3.5 w-full bg-bg-card border border-border rounded-xl px-4 py-3.5 text-left press mt-8 disabled:opacity-60"
        >
          <CreditCard size={20} strokeWidth={1.5} className="text-text-muted shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-[15px] leading-tight">
              {loadingPortal ? "Redirecting..." : "Manage billing"}
            </p>
            <p className="text-text-muted text-[13px] mt-0.5">Change plan, update payment, cancel</p>
          </div>
        </button>
      )}

      <p className="text-center text-[11px] text-text-muted mt-10">
        Secure payment via Stripe. Cancel anytime.
      </p>
    </main>
  );
}
