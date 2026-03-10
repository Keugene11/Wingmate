"use client";

import { createClient } from "@/lib/supabase-browser";
import Link from "next/link";
import { Camera, MessageCircle, Flame, Shield } from "lucide-react";

export default function LoginPage() {
  const handleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="min-h-screen max-w-md mx-auto px-6 py-12 flex flex-col animate-fade-in">
      {/* Hero */}
      <div className="text-center mb-12 pt-8">
        <h1 className="font-display text-[36px] font-extrabold tracking-tight leading-[1.1] mb-3">
          Wingmate
        </h1>
        <p className="text-text-muted text-[17px] leading-relaxed">
          Your AI-powered confidence coach for talking to new people.
        </p>
      </div>

      {/* Features */}
      <div className="space-y-4 mb-12 stagger">
        <div className="flex items-start gap-4 bg-bg-card border border-border rounded-2xl px-5 py-4">
          <div className="w-10 h-10 rounded-full bg-bg-input flex items-center justify-center shrink-0 mt-0.5">
            <Camera size={18} strokeWidth={1.5} className="text-text-muted" />
          </div>
          <div>
            <p className="font-medium text-[15px] mb-0.5">Snap & approach</p>
            <p className="text-text-muted text-[14px] leading-relaxed">
              Take a photo of the situation and get a tailored game plan with specific openers for that exact moment.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 bg-bg-card border border-border rounded-2xl px-5 py-4">
          <div className="w-10 h-10 rounded-full bg-bg-input flex items-center justify-center shrink-0 mt-0.5">
            <MessageCircle size={18} strokeWidth={1.5} className="text-text-muted" />
          </div>
          <div>
            <p className="font-medium text-[15px] mb-0.5">Talk through it</p>
            <p className="text-text-muted text-[14px] leading-relaxed">
              Chat with your AI coach about any situation. Get real advice, not generic self-help — like talking to a friend who&apos;s been there.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 bg-bg-card border border-border rounded-2xl px-5 py-4">
          <div className="w-10 h-10 rounded-full bg-bg-input flex items-center justify-center shrink-0 mt-0.5">
            <Flame size={18} strokeWidth={1.5} className="text-orange-500" />
          </div>
          <div>
            <p className="font-medium text-[15px] mb-0.5">Build the habit</p>
            <p className="text-text-muted text-[14px] leading-relaxed">
              Daily check-ins track your streak. Every day you talk to someone new, your confidence grows. Watch your streak build.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 bg-bg-card border border-border rounded-2xl px-5 py-4">
          <div className="w-10 h-10 rounded-full bg-bg-input flex items-center justify-center shrink-0 mt-0.5">
            <Shield size={18} strokeWidth={1.5} className="text-text-muted" />
          </div>
          <div>
            <p className="font-medium text-[15px] mb-0.5">Private by design</p>
            <p className="text-text-muted text-[14px] leading-relaxed">
              Your photos stay on your device. Chats aren&apos;t stored after the session. No one will ever know.
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-auto">
        <button
          onClick={handleLogin}
          className="flex items-center justify-center gap-3 w-full bg-[#1a1a1a] text-white py-3.5 rounded-xl font-medium text-[15px] press mb-4"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#fff" />
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#fff" />
            <path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#fff" />
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#fff" />
          </svg>
          Get started with Google
        </button>

        <p className="text-center text-[12px] text-text-muted">
          Free to try — no credit card needed.
          <br />
          By continuing, you agree to our{" "}
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
