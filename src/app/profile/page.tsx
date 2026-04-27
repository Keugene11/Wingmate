"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowLeft, LogOut, CreditCard, Camera, Check, ChevronRight, Trash2, FileText, Shield, Mail } from "lucide-react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import SignInModal from "@/components/SignInModal";
import { isNativePlatform } from "@/lib/platform";
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
};

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

  // Toast
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };


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

  }, [status]);

  const handleSignOut = async () => {
    setLoggingOut(true);
    // Aggressive clear first — works around Capacitor WebView cookie
    // persistence where the NextAuth default Max-Age=0 sometimes survives
    // a force-close + reopen cycle.
    try {
      await fetch("/api/auth/native/signout", { method: "POST" });
    } catch {}
    // On native, also revoke the Google/Apple credential cache so the
    // SocialLogin plugin doesn't silently re-auth on next sign-in tap.
    if (isNativePlatform()) {
      try {
        const { SocialLogin } = await import("@capgo/capacitor-social-login");
        await SocialLogin.logout({ provider: "google" }).catch(() => {});
        await SocialLogin.logout({ provider: "apple" }).catch(() => {});
      } catch {}
    }
    // NextAuth's own sign-out (no redirect — we force a hard reload instead).
    try {
      await signOut({ redirect: false });
    } catch {}
    // Hard reload so the WebView commits the cleared cookies to disk before
    // the user can close the app.
    window.location.href = "/onboarding";
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

      {/* Your profile */}
      <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.15em] mb-2 mt-2 px-1">
        Your profile
      </p>
      <div className="space-y-2 mb-5">
        <Link
          href="/profile/stats"
          className="flex items-center gap-3.5 w-full bg-bg-card border border-border rounded-xl shadow-card px-4 py-3.5 press"
        >
          <span className="flex-1 font-medium text-[15px] text-left">Stats</span>
          <ChevronRight size={16} className="text-border shrink-0" />
        </Link>
        <Link
          href="/profile/personal-details"
          className="flex items-center gap-3.5 w-full bg-bg-card border border-border rounded-xl shadow-card px-4 py-3.5 press"
        >
          <span className="flex-1 font-medium text-[15px] text-left">Personal details</span>
          <ChevronRight size={16} className="text-border shrink-0" />
        </Link>
      </div>

      {/* Subscription */}
      <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.15em] mb-2 px-1">
        Subscription
      </p>
      <div className={`bg-bg-card border border-border rounded-xl shadow-card px-4 py-4 ${subscription ? "mb-5" : "mb-2"}`}>
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
      {!subscription && (
        <Link
          href="/plans"
          className="flex items-center gap-3.5 w-full bg-bg-card border border-border rounded-xl shadow-card px-4 py-3.5 text-left press mb-5"
        >
          <CreditCard size={18} strokeWidth={1.5} className="text-text-muted shrink-0" />
          <span className="flex-1 font-medium text-[15px]">Choose a plan</span>
          <ChevronRight size={16} className="text-border shrink-0" />
        </Link>
      )}

      {/* About */}
      <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.15em] mb-2 px-1">
        About
      </p>
      <div className="space-y-2 mb-5">
        <Link
          href="/terms"
          className="flex items-center gap-3.5 w-full bg-bg-card border border-border rounded-xl shadow-card px-4 py-3.5 press"
        >
          <FileText size={18} strokeWidth={1.5} className="text-text-muted shrink-0" />
          <span className="flex-1 font-medium text-[15px] text-left">Terms of Service</span>
          <ChevronRight size={16} className="text-border shrink-0" />
        </Link>
        <Link
          href="/privacy"
          className="flex items-center gap-3.5 w-full bg-bg-card border border-border rounded-xl shadow-card px-4 py-3.5 press"
        >
          <Shield size={18} strokeWidth={1.5} className="text-text-muted shrink-0" />
          <span className="flex-1 font-medium text-[15px] text-left">Privacy Policy</span>
          <ChevronRight size={16} className="text-border shrink-0" />
        </Link>
        <button
          onClick={() => {
            navigator.clipboard.writeText("keugenelee11@gmail.com");
            showToast("Support email copied!");
          }}
          className="flex items-center gap-3.5 w-full bg-bg-card border border-border rounded-xl shadow-card px-4 py-3.5 text-left press"
        >
          <Mail size={18} strokeWidth={1.5} className="text-text-muted shrink-0" />
          <span className="flex-1 font-medium text-[15px]">Support</span>
          <ChevronRight size={16} className="text-border shrink-0" />
        </button>
      </div>

      {/* Account */}
      <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.15em] mb-2 px-1">
        Account
      </p>
      <div className="space-y-2">
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
        <Link
          href="/delete-account"
          className="flex items-center gap-3.5 w-full bg-bg-card border border-border rounded-xl shadow-card px-4 py-3.5 text-left press"
        >
          <Trash2 size={18} strokeWidth={1.5} className="text-red-400 shrink-0" />
          <span className="flex-1 font-medium text-[15px] text-red-500">Delete account</span>
          <ChevronRight size={16} className="text-border shrink-0" />
        </Link>
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
