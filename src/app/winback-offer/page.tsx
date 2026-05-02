"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, AlertTriangle } from "lucide-react";
import { useSession } from "next-auth/react";
import { isNativeAndroid, isNativeiOS, isNativePlatform } from "@/lib/platform";
import { initPurchases, identifyUser, getOfferingById, purchasePackage } from "@/lib/purchases";

type IAPPackage = {
  identifier: string;
  offeringIdentifier: string;
  product: { identifier: string; priceString: string };
  packageType: string;
};

export default function WinbackOfferPage() {
  return (
    <Suspense fallback={null}>
      <WinbackOfferPageInner />
    </Suspense>
  );
}

function WinbackOfferPageInner() {
  const router = useRouter();
  const search = useSearchParams();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [winbackPkg, setWinbackPkg] = useState<IAPPackage | null>(null);
  const [isNative, setIsNative] = useState(false);

  const cancelled = search.get("checkout") === "cancelled";

  // On iOS/Android, fetch the "winback" offering from RevenueCat.
  // Configure it in the RevenueCat dashboard with the $19.99/yr SKU.
  const initIAP = useCallback(async () => {
    if (!isNativePlatform()) return;
    setIsNative(true);
    await initPurchases();
    if (session?.user?.id) await identifyUser(session.user.id);
    const offering = await getOfferingById("winback");
    const pkg = (offering?.availablePackages?.[0] ?? null) as IAPPackage | null;
    setWinbackPkg(pkg);
  }, [session?.user?.id]);

  useEffect(() => {
    initIAP();
  }, [initIAP]);

  const handleClaim = async () => {
    setLoading(true);
    setError(null);

    if (isNative) {
      if (!winbackPkg) {
        setError("This offer isn't available right now. Please try again in a moment.");
        setLoading(false);
        return;
      }
      try {
        const result = await purchasePackage(winbackPkg as unknown as Parameters<typeof purchasePackage>[0]);
        if (result.status === "success") {
          router.replace("/?checkout=success");
          return;
        }
        // Cancelled or unavailable — stay on the page; the offer flag is
        // already burned, but they can still tap Claim again until they leave.
      } catch {
        setError("Purchase could not be completed. Please try again.");
      }
      setLoading(false);
      return;
    }

    // Web / Android-Stripe path
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "winback_yearly" }),
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
    setLoading(false);
  };

  const yearlyPrice = winbackPkg?.product?.priceString ?? "$19.99";
  const monthlyEq = isNative && winbackPkg ? "" : "$1.66";

  return (
    <main className="min-h-app max-w-lg mx-auto px-6 pb-24 animate-fade-in">
      <div className="text-center mt-16 mb-3">
        <p className="text-text-muted text-[12px] uppercase tracking-[0.2em] font-bold mb-3">
          Your one-time offer
        </p>
        <h1 className="font-display text-[36px] font-extrabold tracking-tight leading-[1.05] mb-2">
          80% off, forever
        </h1>
        <p className="text-text-muted text-[15px]">
          Plus a 3-day free trial.
        </p>
      </div>

      {/* Big price card */}
      <div className="bg-[#1a1a1a] text-white rounded-2xl p-8 my-8 text-center">
        <div className="flex items-baseline justify-center gap-2 mb-2">
          <span className="text-white/40 text-[18px] font-medium line-through">$9.99</span>
          {monthlyEq && (
            <span className="font-display text-[56px] font-extrabold tracking-tight">{monthlyEq}</span>
          )}
          {!monthlyEq && (
            <span className="font-display text-[44px] font-extrabold tracking-tight">{yearlyPrice}</span>
          )}
          <span className="text-white/70 text-[18px] font-medium">{monthlyEq ? "/mo" : "/yr"}</span>
        </div>
        <p className="text-white/70 text-[13px]">
          Just {yearlyPrice}/year, billed annually after your free trial
        </p>
      </div>

      <div className="space-y-3 mb-8">
        {[
          "3-day free trial — cancel anytime",
          "Locked in at this price for life",
          "Unlimited AI coaching, tracker & community",
          "No price hikes, ever",
        ].map((f) => (
          <div key={f} className="flex items-center gap-3">
            <Check size={18} strokeWidth={2.5} className="text-[#1a1a1a] shrink-0" />
            <span className="text-[14px] font-medium">{f}</span>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-center mb-4">
          <p className="text-[14px] font-medium text-red-700">{error}</p>
        </div>
      )}

      {cancelled && !error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-center mb-4">
          <p className="text-[14px] font-medium text-amber-800">
            Checkout cancelled. You can still claim this offer — but it won't be here next time.
          </p>
        </div>
      )}

      <button
        onClick={handleClaim}
        disabled={loading}
        className="w-full py-4 rounded-xl bg-[#1a1a1a] text-white text-[15px] font-bold press disabled:opacity-60 mb-4"
      >
        {loading ? (isNative ? "Purchasing..." : "Redirecting...") : "Start 3-day free trial"}
      </button>

      <div className="flex items-start gap-2 px-2 text-text-muted text-[12px] leading-relaxed">
        <AlertTriangle size={14} strokeWidth={2} className="shrink-0 mt-0.5" />
        <p>
          This is a one-time offer. If you leave this page, the 80% discount is gone for good — you'll
          only see the regular pricing from now on.
        </p>
      </div>

      <div className="text-center mt-8">
        <button
          onClick={() => router.replace(isNativeAndroid() || isNativeiOS() ? "/" : "/plans")}
          className="text-text-muted text-[13px] underline press"
        >
          No thanks, take me back
        </button>
      </div>
    </main>
  );
}
