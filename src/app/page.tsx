"use client";

import { useState, useEffect, useCallback } from "react";
import { Camera, Upload, MessageCircle, ChevronRight, User, Sparkles, Flame } from "lucide-react";
import Link from "next/link";
import ImageAnnotator from "@/components/ImageAnnotator";
import ChatCoach from "@/components/ChatCoach";

type AppState = "home" | "annotate" | "chat";

function getSessionState(): { state: AppState; fromPhoto: boolean } {
  if (typeof window === "undefined") return { state: "home", fromPhoto: false };
  try {
    const saved = sessionStorage.getItem("approachai-state");
    if (saved) return JSON.parse(saved);
  } catch {}
  return { state: "home", fromPhoto: false };
}

export default function Home() {
  const [state, setState] = useState<AppState>("home");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameFromPhoto, setCameFromPhoto] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = getSessionState();
    if (saved.state === "chat") {
      setState("chat");
      setCameFromPhoto(saved.fromPhoto);
      try {
        const img = sessionStorage.getItem("approachai-image");
        if (img) setCapturedImage(img);
      } catch {}
    }
    setHydrated(true);
  }, []);

  const updateState = useCallback(
    (newState: AppState, fromPhoto?: boolean) => {
      setState(newState);
      if (fromPhoto !== undefined) setCameFromPhoto(fromPhoto);
      try {
        sessionStorage.setItem(
          "approachai-state",
          JSON.stringify({
            state: newState,
            fromPhoto: fromPhoto ?? cameFromPhoto,
          })
        );
      } catch {}
    },
    [cameFromPhoto]
  );

  const compressImage = (dataUrl: string, maxWidth = 800): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = dataUrl;
    });
  };

  const handleCapture = async (imageData: string) => {
    setCapturedImage(imageData);
    setState("annotate");
    const compressed = await compressImage(imageData);
    try { sessionStorage.setItem("approachai-image", compressed); } catch {}
  };

  const reset = () => {
    setCapturedImage(null);
    try { sessionStorage.removeItem("approachai-image"); } catch {}
    setCameFromPhoto(false);
    updateState("home", false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => handleCapture(reader.result as string);
    reader.readAsDataURL(file);
  };

  if (!hydrated) return null;

  return (
    <main className="min-h-screen max-w-md mx-auto">
      {state === "home" && (
        <div className="flex flex-col min-h-screen animate-fade-in">
          {/* Hero banner with gradient */}
          <div className="gradient-hero px-5 pt-14 pb-8 rounded-b-3xl relative overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-accent/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-accent/8 rounded-full blur-xl" />

            <div className="relative">
              {/* Header */}
              <div className="mb-8 animate-slide-up flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 gradient-cta rounded-lg flex items-center justify-center">
                    <Flame size={16} strokeWidth={2} className="text-white" />
                  </div>
                  <h1 className="font-display text-[24px] font-extrabold tracking-tight leading-none">
                    ApproachAI
                  </h1>
                </div>
                <div className="flex items-center gap-2 shrink-0 mt-0.5">
                  <Link
                    href="/plans"
                    className="h-9 px-3 rounded-full bg-white/70 backdrop-blur border border-accent/15 flex items-center gap-1.5 press text-[13px] font-medium text-accent-dark"
                  >
                    <Sparkles size={14} strokeWidth={1.5} />
                    Plans
                  </Link>
                  <Link
                    href="/profile"
                    className="w-9 h-9 rounded-full bg-white/70 backdrop-blur border border-accent/15 flex items-center justify-center press"
                  >
                    <User size={16} strokeWidth={1.5} className="text-primary" />
                  </Link>
                </div>
              </div>

              {/* Hero text */}
              <div className="animate-slide-up" style={{ animationDelay: "50ms" }}>
                <p className="font-display text-[28px] font-extrabold tracking-tight leading-[1.15] mb-3">
                  Stop overthinking.<br />
                  <span className="text-accent-dark">Go talk to them.</span>
                </p>
                <p className="text-primary/60 text-[15px] leading-relaxed max-w-[300px]">
                  Snap the situation. Get your game plan. Make your move.
                </p>
              </div>
            </div>
          </div>

          <div className="px-5 pt-6 pb-8 flex-1">
            {/* Primary CTA */}
            <div className="mb-3 animate-slide-up" style={{ animationDelay: "100ms" }}>
              <label className="gradient-cta glow-accent pulse-ring flex items-center gap-4 text-white rounded-2xl px-5 py-5 cursor-pointer press">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <Camera size={24} strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <p className="font-display font-bold text-[17px] leading-tight">Snap the scene</p>
                  <p className="text-white/70 text-[13px] mt-1">Your coach takes it from there</p>
                </div>
                <ChevronRight size={18} className="text-white/50 shrink-0" />
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>

            {/* Secondary actions */}
            <div className="space-y-2.5 mb-8 stagger">
              <label className="flex items-center gap-3.5 bg-bg-card border border-border rounded-xl px-4 py-3.5 cursor-pointer press">
                <div className="w-9 h-9 rounded-lg bg-accent-light flex items-center justify-center shrink-0">
                  <Upload size={18} strokeWidth={1.5} className="text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[15px] leading-tight">Upload from gallery</p>
                  <p className="text-text-muted text-[13px] mt-0.5">Already have a photo? Use that</p>
                </div>
                <ChevronRight size={16} className="text-border shrink-0" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>

              <button
                onClick={() => updateState("chat", false)}
                className="flex items-center gap-3.5 w-full bg-bg-card border border-border rounded-xl px-4 py-3.5 text-left press"
              >
                <div className="w-9 h-9 rounded-lg bg-accent-light flex items-center justify-center shrink-0">
                  <MessageCircle size={18} strokeWidth={1.5} className="text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[15px] leading-tight">Just talk to me</p>
                  <p className="text-text-muted text-[13px] mt-0.5">No photo — describe the situation</p>
                </div>
                <ChevronRight size={16} className="text-border shrink-0" />
              </button>
            </div>

            <p className="text-center text-[12px] text-text-muted mt-6 animate-fade-in" style={{ animationDelay: "200ms" }}>
              The fear fades in 5 seconds. The regret doesn&apos;t.
            </p>

            <p className="text-center text-[11px] text-text-muted mt-4 animate-fade-in" style={{ animationDelay: "300ms" }}>
              Your photos stay on your device. Always.
            </p>
          </div>
        </div>
      )}

      {state === "annotate" && capturedImage && (
        <div className="px-5 pt-6 pb-8 animate-fade-in">
          <ImageAnnotator
            imageData={capturedImage}
            onConfirm={() => updateState("chat", true)}
            onBack={() => {
              setCapturedImage(null);
              setState("home");
            }}
          />
        </div>
      )}

      {state === "chat" && (
        <ChatCoach onBack={reset} fromPhoto={cameFromPhoto} imageData={capturedImage} />
      )}
    </main>
  );
}
