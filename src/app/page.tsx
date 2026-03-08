"use client";

import { useState, useEffect, useCallback } from "react";
import { Camera, Upload, ArrowRight, MessageCircle } from "lucide-react";
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
    // Compress for AI analysis (keep original for annotator display)
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
        <div className="px-6 pt-14 pb-8 flex flex-col min-h-screen">
          <div className="flex-1">
            <h1 className="text-[32px] font-bold tracking-tight leading-[1.15] mb-6">
              Approach<span className="text-accent">AI</span>
            </h1>

            <div className="mb-8">
              <p className="text-[22px] font-semibold leading-snug mb-2">
                She caught your eye.
              </p>
              <p className="text-text-muted text-[15px] leading-relaxed">
                Get a real game plan and the confidence to go talk to her. No overthinking, just action.
              </p>
            </div>

            {/* Action cards */}
            <div className="space-y-3">
              <label className="flex items-center gap-4 rounded-2xl p-4 cursor-pointer active:scale-[0.98] transition-transform border border-border">
                <div className="w-11 h-11 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                  <Camera size={20} className="text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[15px]">Take a photo</p>
                  <p className="text-text-muted text-[13px]">Use your camera right now</p>
                </div>
                <ArrowRight size={18} className="text-text-muted shrink-0" />
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>

              <label className="flex items-center gap-4 rounded-2xl p-4 cursor-pointer active:scale-[0.98] transition-transform border border-border">
                <div className="w-11 h-11 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                  <Upload size={20} className="text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[15px]">Upload a screenshot</p>
                  <p className="text-text-muted text-[13px]">From your gallery or files</p>
                </div>
                <ArrowRight size={18} className="text-text-muted shrink-0" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>

              <button
                onClick={() => updateState("chat", false)}
                className="flex items-center gap-4 w-full rounded-2xl p-4 text-left active:scale-[0.98] transition-transform border border-border"
              >
                <div className="w-11 h-11 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                  <MessageCircle size={20} className="text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[15px]">Just talk to me</p>
                  <p className="text-text-muted text-[13px]">Get a pep talk for any situation</p>
                </div>
                <ArrowRight size={18} className="text-text-muted shrink-0" />
              </button>
            </div>
          </div>

          <p className="text-center text-[12px] text-text-muted mt-10">
            Your photos never leave your device.
          </p>
        </div>
      )}

      {state === "annotate" && capturedImage && (
        <div className="px-5 pt-6 pb-8">
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
