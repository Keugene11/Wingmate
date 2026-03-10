"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowLeft, LogOut, CreditCard, Camera, Check, ChevronRight, Trash2, Flame } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";

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
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<Subscription>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  // Edit state
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stats
  const [streak, setStreak] = useState(0);
  const [totalCheckins, setTotalCheckins] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setEmail(user.email || "");
    });

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
  }, []);

  const handleSignOut = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push("/login");
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

    setUploadingAvatar(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${profile.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setUploadingAvatar(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const avatar_url = urlData.publicUrl + "?t=" + Date.now();

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatar_url }),
    });
    const data = await res.json();
    if (data.profile) setProfile(data.profile);
    setUploadingAvatar(false);
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const avatarSrc = profile?.avatar_url || undefined;

  return (
    <main className="min-h-screen max-w-md mx-auto px-5 pt-6 pb-24 animate-fade-in">
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
        <div className="bg-bg-card border border-border rounded-xl px-4 py-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Flame size={16} strokeWidth={1.5} className="text-orange-500" />
            <span className="font-display text-[22px] font-bold">{streak}</span>
          </div>
          <p className="text-[12px] text-text-muted">Day streak</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl px-4 py-3 text-center">
          <span className="font-display text-[22px] font-bold">{totalCheckins}</span>
          <p className="text-[12px] text-text-muted">Check-ins this week</p>
        </div>
      </div>

      {/* Subscription */}
      <div className="bg-bg-card border border-border rounded-xl px-4 py-4 mb-3">
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
          className="flex items-center gap-3.5 w-full bg-bg-card border border-border rounded-xl px-4 py-3.5 text-left press"
        >
          <CreditCard size={18} strokeWidth={1.5} className="text-text-muted shrink-0" />
          <span className="flex-1 font-medium text-[15px]">
            {subscription ? "Manage subscription" : "Choose a plan"}
          </span>
          <ChevronRight size={16} className="text-border shrink-0" />
        </Link>

        <Link
          href="/delete-account"
          className="flex items-center gap-3.5 w-full bg-bg-card border border-border rounded-xl px-4 py-3.5 text-left press"
        >
          <Trash2 size={18} strokeWidth={1.5} className="text-red-400 shrink-0" />
          <span className="flex-1 font-medium text-[15px] text-red-500">Delete account</span>
          <ChevronRight size={16} className="text-border shrink-0" />
        </Link>

        <button
          onClick={handleSignOut}
          disabled={loggingOut}
          className="flex items-center gap-3.5 w-full bg-bg-card border border-border rounded-xl px-4 py-3.5 text-left press disabled:opacity-60"
        >
          <LogOut size={18} strokeWidth={1.5} className="text-text-muted shrink-0" />
          <span className="flex-1 font-medium text-[15px]">
            {loggingOut ? "Signing out..." : "Sign out"}
          </span>
        </button>
      </div>

      <div className="mt-8 text-center">
        <Link href="/privacy" className="text-[12px] text-text-muted underline">
          Privacy Policy
        </Link>
      </div>

      <BottomNav />
    </main>
  );
}
