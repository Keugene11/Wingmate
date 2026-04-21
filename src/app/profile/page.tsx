"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowLeft, LogOut, CreditCard, Camera, Check, ChevronRight, Trash2, Flame, Heart, Sparkles, PartyPopper, Pencil, X } from "lucide-react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import SignInModal from "@/components/SignInModal";
import { useRouter } from "next/navigation";

type Subscription = {
  status: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
} | null;

type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  goal: string | null;
  custom_goal: string | null;
};

const GOAL_OPTIONS = [
  { id: "girlfriend", icon: Heart, label: "Get a girlfriend" },
  { id: "rizz", icon: Sparkles, label: "Improve my rizz" },
  { id: "hookups", icon: Flame, label: "Meet more people & date casually" },
  { id: "memories", icon: PartyPopper, label: "Just have fun memories" },
];

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<Subscription>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);

  // Edit state
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Goals
  // Toast
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // Goals
  const [editingGoals, setEditingGoals] = useState(false);
  const [goalSelection, setGoalSelection] = useState<Set<string>>(new Set());
  const [customGoalInput, setCustomGoalInput] = useState("");
  const [savingGoals, setSavingGoals] = useState(false);

  // Stats
  const [streak, setStreak] = useState(0);
  const [totalCheckins, setTotalCheckins] = useState(0);

  const isLoggedIn = status === "loading" ? null : status === "authenticated";
  const email = session?.user?.email || "";

  useEffect(() => {
    if (status !== "authenticated") return;

    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.profile) {
          setProfile(data.profile);
          setUsernameInput(data.profile.username);
        }
      })
      .catch(() => {});

    fetch("/api/stripe/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.subscription) setSubscription(data.subscription);
      })
      .catch(() => {});

    fetch("/api/checkin")
      .then((res) => res.json())
      .then((data) => {
        setStreak(data.streak || 0);
        const checked = (data.last7 || []).filter((d: { talked: boolean | null }) => d.talked !== null).length;
        setTotalCheckins(checked);
      })
      .catch(() => {});
  }, [status]);

  const handleSignOut = async () => {
    setLoggingOut(true);
    await signOut({ redirectTo: "/" });
  };

  const saveUsername = async () => {
    const trimmed = usernameInput.trim();
    if (!trimmed || trimmed === profile?.username) {
      setEditingUsername(false);
      return;
    }
    setSavingUsername(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: trimmed }),
    });
    const data = await res.json();
    if (data.profile) {
      setProfile(data.profile);
      setUsernameInput(data.profile.username);
    }
    setSavingUsername(false);
    setEditingUsername(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    // Client-side validation (server enforces these too via bucket config)
    if (file.size > 2 * 1024 * 1024) {
      showToast("Image must be under 2MB");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      showToast("Only JPEG, PNG, WebP, and GIF images are allowed");
      return;
    }

    setUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body: formData });
      const data = await res.json();
      if (data.profile) setProfile(data.profile);
    } catch {
      showToast("Failed to upload avatar");
    }
    setUploadingAvatar(false);
  };

  const startEditingGoals = () => {
    const current = profile?.goal ? new Set(profile.goal.split(",").filter(Boolean)) : new Set<string>();
    setGoalSelection(current);
    setCustomGoalInput(profile?.custom_goal || "");
    setEditingGoals(true);
  };

  const toggleGoalSelection = (id: string) => {
    setGoalSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const saveGoals = async () => {
    setSavingGoals(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goal: Array.from(goalSelection).join(","),
        custom_goal: customGoalInput.trim(),
      }),
    });
    const data = await res.json();
    if (data.profile) {
      setProfile(data.profile);
    }
    setSavingGoals(false);
    setEditingGoals(false);
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const avatarSrc = profile?.avatar_url || undefined;

  if (isLoggedIn === false) {
    return (
      <main className="min-h-app max-w-md mx-auto px-5 pt-6 pb-24 animate-fade-in">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => router.push("/")} className="p-1 -ml-1 press">
            <ArrowLeft size={20} strokeWidth={1.5} />
          </button>
          <h1 className="font-display text-[20px] font-bold tracking-tight">Profile</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-bg-input flex items-center justify-center mb-6">
            <span className="text-[28px] font-bold text-text-muted">?</span>
          </div>
          <h2 className="font-display text-[20px] font-bold mb-2">Sign in to view your profile</h2>
          <p className="text-text-muted text-[14px] leading-relaxed mb-6 max-w-[260px]">
            Track your streaks, manage your subscription, and customize your profile.
          </p>
          <button
            onClick={() => setShowSignIn(true)}
            className="px-6 py-3 bg-[#1a1a1a] text-white rounded-xl font-medium text-[14px] press"
          >
            Sign in
          </button>
          <SignInModal open={showSignIn} onClose={() => setShowSignIn(false)} />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-app max-w-md mx-auto px-5 pt-6 pb-24 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.push("/")} className="p-1 -ml-1 press">
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>
        <h1 className="font-display text-[20px] font-bold tracking-tight">Profile</h1>
      </div>

      {/* Avatar + Name */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative mb-4">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-bg-input flex items-center justify-center">
            {avatarSrc ? (
              <img src={avatarSrc} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span className="text-[28px] font-bold text-text-muted">
                {(profile?.username || "?")[0].toUpperCase()}
              </span>
            )}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center press"
          >
            <Camera size={14} strokeWidth={2} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />
          {uploadingAvatar && (
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Username */}
        {editingUsername ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value.slice(0, 30))}
              onKeyDown={(e) => e.key === "Enter" && saveUsername()}
              className="bg-bg-card border border-border rounded-lg px-3 py-1.5 text-[16px] font-medium text-center w-40 outline-none focus:border-text-muted"
            />
            <button
              onClick={saveUsername}
              disabled={savingUsername}
              className="w-8 h-8 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center press"
            >
              <Check size={14} strokeWidth={2.5} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditingUsername(true)}
            className="font-display text-[20px] font-bold tracking-tight press flex items-center gap-1.5"
          >
            {profile?.username || "Set nickname"}
            <span className="text-text-muted text-[12px] font-normal">edit</span>
          </button>
        )}
        <p className="text-text-muted text-[13px] mt-1">{email}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-bg-card border border-border rounded-xl shadow-card px-4 py-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Flame size={16} strokeWidth={1.5} className="text-orange-500" />
            <span className="font-display text-[22px] font-bold">{streak}</span>
          </div>
          <p className="text-[12px] text-text-muted">Day streak</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl shadow-card px-4 py-3 text-center">
          <span className="font-display text-[22px] font-bold">{totalCheckins}</span>
          <p className="text-[12px] text-text-muted">Check-ins this week</p>
        </div>
      </div>

      {/* Goals */}
      <div className="bg-bg-card border border-border rounded-xl shadow-card px-4 py-4 mb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[12px] font-semibold text-text-muted uppercase tracking-wide">
            Your Goals
          </p>
          {!editingGoals && (
            <button onClick={startEditingGoals} className="text-[12px] font-medium text-text-muted press">
              Edit
            </button>
          )}
        </div>
        {editingGoals ? (
          <div>
            <div className="space-y-2 mb-3">
              {GOAL_OPTIONS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => toggleGoalSelection(g.id)}
                  className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] font-medium transition-colors ${
                    goalSelection.has(g.id)
                      ? "bg-[#1a1a1a] text-white"
                      : "bg-bg-input text-text"
                  }`}
                >
                  <g.icon size={16} strokeWidth={1.5} />
                  {g.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 bg-bg-input rounded-xl px-3 py-2.5 mb-3">
              <Pencil size={16} strokeWidth={1.5} className="text-text-muted shrink-0" />
              <input
                type="text"
                value={customGoalInput}
                onChange={(e) => setCustomGoalInput(e.target.value.slice(0, 100))}
                placeholder="Custom goal..."
                className="flex-1 bg-transparent text-[14px] placeholder:text-text-muted/50 outline-none"
              />
              {customGoalInput && (
                <button onClick={() => setCustomGoalInput("")} className="press">
                  <X size={14} className="text-text-muted" />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditingGoals(false)}
                className="flex-1 py-2 rounded-xl text-[13px] font-medium bg-bg-input press"
              >
                Cancel
              </button>
              <button
                onClick={saveGoals}
                disabled={savingGoals}
                className="flex-1 py-2 rounded-xl text-[13px] font-medium bg-[#1a1a1a] text-white press disabled:opacity-60"
              >
                {savingGoals ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <div>
            {(() => {
              const goalLabels = (profile?.goal || "").split(",").filter(Boolean).map(
                (g) => GOAL_OPTIONS.find((o) => o.id === g)?.label
              ).filter(Boolean);
              if (profile?.custom_goal) goalLabels.push(profile.custom_goal);
              return goalLabels.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {goalLabels.map((label) => (
                    <span key={label} className="text-[13px] bg-bg-input rounded-lg px-3 py-1.5 font-medium">
                      {label}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-text-muted text-[14px]">No goals set</p>
              );
            })()}
          </div>
        )}
      </div>

      {/* Subscription */}
      <div className="bg-bg-card border border-border rounded-xl shadow-card px-4 py-4 mb-3">
        <p className="text-[12px] font-semibold text-text-muted uppercase tracking-wide mb-2">
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
      <div className="space-y-2 mt-4">
        <Link
          href="/plans"
          className="flex items-center gap-3.5 w-full bg-bg-card border border-border rounded-xl shadow-card px-4 py-3.5 text-left press"
        >
          <CreditCard size={18} strokeWidth={1.5} className="text-text-muted shrink-0" />
          <span className="flex-1 font-medium text-[15px]">
            {subscription ? "Manage subscription" : "Choose a plan"}
          </span>
          <ChevronRight size={16} className="text-border shrink-0" />
        </Link>

        <Link
          href="/delete-account"
          className="flex items-center gap-3.5 w-full bg-bg-card border border-border rounded-xl shadow-card px-4 py-3.5 text-left press"
        >
          <Trash2 size={18} strokeWidth={1.5} className="text-red-400 shrink-0" />
          <span className="flex-1 font-medium text-[15px] text-red-500">Delete account</span>
          <ChevronRight size={16} className="text-border shrink-0" />
        </Link>

        <button
          onClick={handleSignOut}
          disabled={loggingOut}
          className="flex items-center gap-3.5 w-full bg-bg-card border border-border rounded-xl shadow-card px-4 py-3.5 text-left press disabled:opacity-60"
        >
          <LogOut size={18} strokeWidth={1.5} className="text-text-muted shrink-0" />
          <span className="flex-1 font-medium text-[15px]">
            {loggingOut ? "Signing out..." : "Sign out"}
          </span>
        </button>
      </div>

      <div className="mt-8 text-center space-x-3">
        <Link href="/terms" className="text-[12px] text-text-muted underline">
          Terms of Service
        </Link>
        <Link href="/privacy" className="text-[12px] text-text-muted underline">
          Privacy Policy
        </Link>
        <button
          onClick={() => {
            navigator.clipboard.writeText("keugenelee11@gmail.com");
            showToast("Support email copied!");
          }}
          className="text-[12px] text-text-muted underline"
        >
          Support
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[100] bg-[#1a1a1a] text-white text-[13px] font-medium px-5 py-2.5 rounded-full shadow-lg animate-fade-in">
          {toast}
        </div>
      )}
    </main>
  );
}
