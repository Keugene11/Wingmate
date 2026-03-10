"use client";

import { useState, useEffect, useCallback } from "react";
import { Camera, Upload, MessageCircle, ChevronRight, User, Sparkles } from "lucide-react";
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
        <div className="px-5 pt-16 pb-10 flex flex-col min-h-screen animate-fade-in">
          <div className="flex-1">
            {/* Header */}
            <div className="flex items-center justify-between mb-16 animate-slide-up">
              <h1 className="font-display text-[20px] font-bold tracking-tight leading-none">
                ApproachAI
              </h1>
              <div className="flex items-center gap-2">
                <Link
                  href="/plans"
                  className="h-9 px-3.5 rounded-full bg-bg-card border border-border flex items-center gap-1.5 press text-[13px] font-medium text-text-muted"
                >
                  <Sparkles size={13} strokeWidth={1.5} />
                  Plans
                </Link>
                <Link
                  href="/profile"
                  className="w-9 h-9 rounded-full bg-bg-card border border-border flex items-center justify-center press"
                >
                  <User size={15} strokeWidth={1.5} className="text-text-muted" />
                </Link>
              </div>
            </div>

            {/* Hero */}
            <div className="mb-16 animate-slide-up" style={{ animationDelay: "60ms" }}>
              <h2 className="font-display text-[36px] font-extrabold tracking-tight leading-[1.1] mb-4">
                Stop<br />
                overthinking.
              </h2>
              <p className="text-text-muted text-[16px] leading-relaxed">
                Snap the scene. Get your game plan.
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-3 stagger">
              {/* Primary — Take photo */}
              <label className="flex items-center gap-4 w-full bg-white text-black rounded-2xl px-5 py-4.5 cursor-pointer press">
                <Camera size={22} strokeWidth={1.5} className="shrink-0" />
                <p className="font-medium text-[16px]">Take a photo</p>
                <ChevronRight size={16} className="ml-auto text-black/30 shrink-0" />
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>

              {/* Upload */}
              <label className="flex items-center gap-4 w-full bg-bg-card border border-border rounded-2xl px-5 py-4.5 cursor-pointer press">
                <Upload size={22} strokeWidth={1.5} className="text-text-muted shrink-0" />
                <p className="font-medium text-[16px]">Upload a photo</p>
                <ChevronRight size={16} className="ml-auto text-border shrink-0" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>

              {/* Chat */}
              <button
                onClick={() => updateState("chat", false)}
                className="flex items-center gap-4 w-full bg-bg-card border border-border rounded-2xl px-5 py-4.5 text-left press"
              >
                <MessageCircle size={22} strokeWidth={1.5} className="text-text-muted shrink-0" />
                <p className="font-medium text-[16px]">Just talk to me</p>
                <ChevronRight size={16} className="ml-auto text-border shrink-0" />
              </button>
            </div>
          </div>

          <p className="text-center text-[12px] text-text-muted mt-16 animate-fade-in" style={{ animationDelay: "300ms" }}>
            Your photos stay on your device. Always.
          </p>
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
