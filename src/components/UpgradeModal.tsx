"use client";

import { X, Lock } from "lucide-react";
import { useRouter } from "next/navigation";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

export default function UpgradeModal({ open, onClose, title = "Pro feature", description = "Upgrade to Pro to unlock this feature and track your progress." }: UpgradeModalProps) {
  const router = useRouter();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-bg border border-border rounded-2xl px-6 py-8 max-w-sm w-full text-center animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-3 right-3 p-2 text-text-muted press">
          <X size={18} strokeWidth={2} />
        </button>

        <div className="w-14 h-14 rounded-full bg-bg-card border border-border flex items-center justify-center mx-auto mb-4">
          <Lock size={22} strokeWidth={1.5} className="text-text-muted" />
        </div>

        <h2 className="font-display text-[20px] font-bold mb-2">{title}</h2>
        <p className="text-text-muted text-[14px] leading-relaxed mb-6">{description}</p>

        <button
          onClick={() => { onClose(); router.push("/plans"); }}
          className="w-full py-3.5 rounded-xl bg-[#1a1a1a] text-white text-[14px] font-semibold press"
        >
          Upgrade to Pro
        </button>
      </div>
    </div>
  );
}
