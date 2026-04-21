"use client";

import { Flame, MessageCircle, Users, User, BarChart3, Crown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type Tab = "checkin" | "coach" | "stats" | "community" | "plans";

interface BottomNavProps {
  active?: Tab;
  onChange?: (tab: Tab) => void;
}

const tabs: { id: Tab; label: string; icon: typeof Flame }[] = [
  { id: "checkin", label: "Today", icon: Flame },
  { id: "coach", label: "Wingmate", icon: MessageCircle },
  { id: "stats", label: "Stats", icon: BarChart3 },
  { id: "community", label: "Community", icon: Users },
  { id: "plans", label: "Plans", icon: Crown },
];

export default function BottomNav({ active, onChange }: BottomNavProps) {
  const pathname = usePathname();
  const isProfilePage = pathname === "/profile";
  const [sab, setSab] = useState(0);
  const [mounted, setMounted] = useState(false);

  // Snapshot env(safe-area-inset-bottom) once on mount. Android targetSdk 36
  // forces edge-to-edge — the inset reports the system gesture-nav area, which
  // we need as a constant (it changes mid-scroll on some devices).
  useEffect(() => {
    const probe = document.createElement("div");
    probe.style.cssText = "position:absolute;visibility:hidden;padding-bottom:env(safe-area-inset-bottom)";
    document.body.appendChild(probe);
    const measured = parseFloat(getComputedStyle(probe).paddingBottom) || 0;
    document.body.removeChild(probe);
    setSab(measured);
    setMounted(true);
  }, []);

  const nav = (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
    >
      <div
        className="bg-bg border-t border-border shadow-nav"
      >
        <div className="max-w-md mx-auto flex items-center justify-around py-2">
          {tabs.map(({ id, label, icon: Icon }) => {
            const isActive = !isProfilePage && active === id;
            return onChange ? (
              <button
                key={id}
                onClick={() => onChange(id)}
                className={`flex flex-col items-center gap-0.5 px-4 py-1 press transition-colors ${
                  isActive ? "text-text" : "text-text-muted/50"
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            ) : (
              <Link
                key={id}
                href={`/?tab=${id}`}
                className={`flex flex-col items-center gap-0.5 px-4 py-1 press text-text-muted/50`}
              >
                <Icon size={20} strokeWidth={1.5} />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
          <Link
            href="/profile"
            className={`flex flex-col items-center gap-0.5 px-4 py-1 press transition-colors ${
              isProfilePage ? "text-text" : "text-text-muted/50"
            }`}
          >
            <User size={20} strokeWidth={isProfilePage ? 2 : 1.5} />
            <span className="text-[10px] font-medium">Profile</span>
          </Link>
        </div>
      </div>
      {/* Android targetSdk 36 enforces edge-to-edge; theme navigationBarColor
          is ignored. Paint a gray strip behind the transparent system nav. */}
      <div style={{ height: sab, background: "#6B7280" }} />
    </nav>
  );

  // Portal to document.body so the nav escapes any <main> ancestor that might
  // be creating a compositing context (e.g. animate-fade-in opacity animation)
  // which would trap fixed positioning inside the ancestor's layer.
  if (!mounted) return null;
  return createPortal(nav, document.body);
}
