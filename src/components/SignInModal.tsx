"use client";

import { X } from "lucide-react";
import { signInWithGoogle, signInWithApple } from "@/lib/supabase-browser";
import { isNativeAndroid } from "@/lib/platform";

export default function SignInModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="bg-bg border border-border rounded-2xl px-6 py-8 w-[90%] max-w-sm relative animate-slide-up">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 press">
          <X size={18} strokeWidth={1.5} className="text-text-muted" />
        </button>
        <h3 className="font-display text-[20px] font-bold tracking-tight mb-2">Sign in</h3>
        <p className="text-text-muted text-[14px] mb-6">Choose how you want to sign in.</p>
        <div className="space-y-3">
          <button
            onClick={() => signInWithGoogle()}
            className="w-full flex items-center justify-center gap-3 bg-white border border-border py-3.5 rounded-2xl font-semibold text-[15px] press shadow-sm"
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continue with Google
          </button>
          {!isNativeAndroid() && (
            <button
              onClick={() => signInWithApple()}
              className="w-full flex items-center justify-center gap-3 bg-[#1a1a1a] text-white py-3.5 rounded-2xl font-semibold text-[15px] press"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.32-2.11 4.45-3.74 4.25z"/>
              </svg>
              Continue with Apple
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
