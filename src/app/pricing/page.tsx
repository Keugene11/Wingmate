"use client";

import { useState } from "react";
import { Check } from "lucide-react";

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (plan: "monthly" | "yearly") => {
    setLoading(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setLoading(null);
    }
  };

  return (
    <main className="min-h-screen max-w-md mx-auto px-5 pt-14 pb-8 animate-fade-in">
      <div className="mb-10 animate-slide-up">
        <h1 className="font-display text-[28px] font-extrabold tracking-tight leading-none mb-2">
          Unlock Wingmate
        </h1>
        <p className="text-text-muted text-[15px]">
          Your AI wingman, always in your pocket.
        </p>
      </div>

      <div className="space-y-3 stagger">
        {/* Yearly - Best Value */}
        <button
          onClick={() => handleCheckout("yearly")}
          disabled={!!loading}
          className="w-full bg-[#1a1a1a] text-white rounded-xl px-5 py-5 text-left press relative overflow-hidden disabled:opacity-60"
        >
          <div className="absolute top-3 right-4 bg-white/20 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full">
            SAVE 33%
          </div>
          <p className="font-display font-bold text-[18px] leading-tight">Yearly</p>
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <span className="text-[28px] font-bold leading-none">$10</span>
            <span className="text-white/70 text-[14px]">/month</span>
          </div>
          <p className="text-white/60 text-[13px] mt-1">$120 billed annually</p>
          {loading === "yearly" && (
            <p className="text-white/80 text-[13px] mt-2">Redirecting...</p>
          )}
        </button>

        {/* Monthly */}
        <button
          onClick={() => handleCheckout("monthly")}
          disabled={!!loading}
          className="w-full bg-bg-card border border-border rounded-xl px-5 py-5 text-left press disabled:opacity-60"
        >
          <p className="font-display font-bold text-[18px] leading-tight">Monthly</p>
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <span className="text-[28px] font-bold leading-none">$15</span>
            <span className="text-text-muted text-[14px]">/month</span>
          </div>
          <p className="text-text-muted text-[13px] mt-1">Cancel anytime</p>
          {loading === "monthly" && (
            <p className="text-text-muted text-[13px] mt-2">Redirecting...</p>
          )}
        </button>
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
            <Check size={16} strokeWidth={2.5} className="text-[#1a1a1a] shrink-0" />
            <span className="text-[14px]">{feature}</span>
          </div>
        ))}
      </div>

      <p className="text-center text-[11px] text-text-muted mt-10">
        Secure payment via Stripe. Cancel anytime.
      </p>
    </main>
  );
}
