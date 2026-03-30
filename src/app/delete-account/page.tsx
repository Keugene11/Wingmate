"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";

export default function DeleteAccountPage() {
  const [confirmed, setConfirmed] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) {
        setLoading(false);
        return;
      }
      await signOut({ redirectTo: "/" });
    } catch {
      setLoading(false);
      return;
    }
    setDeleted(true);
    setLoading(false);
  };

  if (deleted) {
    return (
      <main className="min-h-dvh max-w-md mx-auto px-5 pt-16 pb-10 animate-fade-in">
        <h1 className="font-display text-[24px] font-bold tracking-tight mb-4">Account deleted</h1>
        <p className="text-text-muted text-[15px] leading-relaxed mb-6">
          Your account data has been deleted. Your Google account itself is not affected.
        </p>
        <Link href="/" className="text-[14px] font-medium underline">
          Return home
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-dvh max-w-md mx-auto px-5 pt-6 pb-10 animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/profile" className="p-1 -ml-1 press">
          <ArrowLeft size={20} strokeWidth={1.5} />
        </Link>
        <h1 className="font-display text-[20px] font-bold tracking-tight">Delete account</h1>
      </div>

      <div className="space-y-4 mb-8">
        <h2 className="font-display text-[18px] font-bold">What happens when you delete your account</h2>
        <div className="space-y-3 text-[15px] leading-relaxed">
          <p><strong>Immediately deleted:</strong></p>
          <ul className="list-disc pl-5 text-text-muted space-y-1">
            <li>Your community posts, comments, and votes</li>
            <li>Your usage history and session data</li>
            <li>Your subscription records</li>
            <li>Your Wingmate account and profile</li>
          </ul>
          <p><strong>Not affected:</strong></p>
          <ul className="list-disc pl-5 text-text-muted space-y-1">
            <li>Your Google account</li>
            <li>Active Stripe subscriptions (cancel separately at your payment provider)</li>
          </ul>
          <p className="text-text-muted">
            This action is permanent and cannot be undone.
          </p>
        </div>
      </div>

      <label className="flex items-center gap-3 mb-6 cursor-pointer">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="w-5 h-5 rounded border-border accent-[#1a1a1a]"
        />
        <span className="text-[14px]">I understand this is permanent</span>
      </label>

      <button
        onClick={handleDelete}
        disabled={!confirmed || loading}
        className={`w-full py-3.5 rounded-xl text-[15px] font-medium press transition-opacity ${
          confirmed ? "bg-red-600 text-white" : "bg-border text-text-muted opacity-50 cursor-not-allowed"
        }`}
      >
        {loading ? "Deleting..." : "Delete my account"}
      </button>
    </main>
  );
}
