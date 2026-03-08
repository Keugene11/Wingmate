"use client";

import { useState, useEffect, useCallback } from "react";
import { Camera, Upload, MessageCircle, ChevronRight } from "lucide-react";
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
        <div className="px-6 pt-16 pb-8 flex flex-col min-h-screen animate-fade-in">
          <div className="flex-1">
            {/* Serif headline like Hinge */}
            <div className="mb-12 animate-slide-up">
              <h1 className="text-[34px] font-bold tracking-tight leading-[1.1] mb-3">
                She caught<br />your eye.
              </h1>
              <p className="text-text-muted text-[16px] leading-relaxed font-light">
                Get a real game plan and the confidence<br />to go talk to her.
              </p>
            </div>

            {/* Action cards with staggered animation */}
            <div className="space-y-3 stagger-children">
              <label className="flex items-center gap-4 bg-bg-card rounded-2xl px-5 py-4 cursor-pointer press-scale">
                <div className="w-10 h-10 rounded-full bg-bg flex items-center justify-center shrink-0">
                  <Camera size={18} strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[15px]">Take a photo</p>
                  <p className="text-text-muted text-[13px] font-light">Use your camera right now</p>
                </div>
                <ChevronRight size={16} className="text-text-muted/60" />
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>

              <label className="flex items-center gap-4 bg-bg-card rounded-2xl px-5 py-4 cursor-pointer press-scale">
                <div className="w-10 h-10 rounded-full bg-bg flex items-center justify-center shrink-0">
                  <Upload size={18} strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[15px]">Upload a photo</p>
                  <p className="text-text-muted text-[13px] font-light">From your gallery or files</p>
                </div>
                <ChevronRight size={16} className="text-text-muted/60" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>

              <button
                onClick={() => updateState("chat", false)}
                className="flex items-center gap-4 w-full bg-bg-card rounded-2xl px-5 py-4 text-left press-scale"
              >
                <div className="w-10 h-10 rounded-full bg-bg flex items-center justify-center shrink-0">
                  <MessageCircle size={18} strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[15px]">Just talk to me</p>
                  <p className="text-text-muted text-[13px] font-light">Get coached through any situation</p>
                </div>
                <ChevronRight size={16} className="text-text-muted/60" />
              </button>
            </div>
          </div>

          <p className="text-center text-[12px] text-text-muted/60 mt-12 font-light animate-fade-in" style={{ animationDelay: "500ms" }}>
            Your photos never leave your device.
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
