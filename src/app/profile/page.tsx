"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, LogOut, CreditCard, User, ChevronRight } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

type Subscription = {
  status: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
} | null;

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ email?: string; name?: string; avatar?: string } | null>(null);
  const [subscription, setSubscription] = useState<Subscription>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser({
          email: user.email,
          name: user.user_metadata?.full_name || user.user_metadata?.name,
          avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture,
        });
      }
    });

    fetch("/api/stripe/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.subscription) setSubscription(data.subscription);
      })
      .catch(() => {});
  }, []);

  const handleSignOut = async () => {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <main className="min-h-screen max-w-md mx-auto px-5 pt-14 pb-8 animate-fade-in">
      <button
        onClick={() => router.push("/")}
        className="flex items-center gap-1.5 text-text-muted text-[14px] mb-8 press"
      >
        <ArrowLeft size={16} strokeWidth={1.5} />
        Back
      </button>

      <div className="mb-10 animate-slide-up">
        <h1 className="font-display text-[28px] font-extrabold tracking-tight leading-none mb-2">
          Profile
        </h1>
      </div>

      {/* User Info */}
      <div className="bg-bg-card border border-border rounded-xl px-4 py-4 mb-3 stagger">
        <div className="flex items-center gap-3.5">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt=""
              className="w-10 h-10 rounded-full"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-bg-input flex items-center justify-center">
              <User size={18} strokeWidth={1.5} className="text-text-muted" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            {user?.name && (
              <p className="font-medium text-[15px] leading-tight truncate">{user.name}</p>
            )}
            <p className="text-text-muted text-[13px] mt-0.5 truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Subscription */}
      <div className="bg-bg-card border border-border rounded-xl px-4 py-4 mb-3">
        <p className="text-[13px] font-semibold text-text-muted uppercase tracking-wide mb-3">
          Subscription
        </p>
        {subscription ? (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-[15px]">Wingmate Pro</span>
              <span className="text-[11px] font-semibold bg-[#1a1a1a] text-white px-2 py-0.5 rounded-full">
                {subscription.status === "active" ? "Active" : subscription.status}
              </span>
            </div>
            <p className="text-text-muted text-[13px]">
              {subscription.cancel_at_period_end
                ? `Cancels ${formatDate(subscription.current_period_end)}`
                : `Renews ${formatDate(subscription.current_period_end)}`}
            </p>
          </div>
        ) : (
          <p className="text-text-muted text-[14px]">No active subscription</p>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-2.5 mt-6 stagger">
        <Link
          href="/plans"
          className="flex items-center gap-3.5 w-full bg-bg-card border border-border rounded-xl px-4 py-3.5 text-left press"
        >
          <CreditCard size={20} strokeWidth={1.5} className="text-text-muted shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-[15px] leading-tight">Plans & billing</p>
            <p className="text-text-muted text-[13px] mt-0.5">
              {subscription ? "Manage your subscription" : "Choose a plan"}
            </p>
          </div>
          <ChevronRight size={16} className="text-border shrink-0" />
        </Link>

        <button
          onClick={handleSignOut}
          disabled={loggingOut}
          className="flex items-center gap-3.5 w-full bg-bg-card border border-border rounded-xl px-4 py-3.5 text-left press disabled:opacity-60"
        >
          <LogOut size={20} strokeWidth={1.5} className="text-text-muted shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-[15px] leading-tight">
              {loggingOut ? "Signing out..." : "Sign out"}
            </p>
          </div>
        </button>
      </div>
    </main>
  );
}
