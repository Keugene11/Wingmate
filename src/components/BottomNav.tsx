"use client";

import { Flame, MessageCircle, Users, User, BarChart3, Crown } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export type Tab = "checkin" | "coach" | "stats" | "community" | "plans";

const tabs: { id: Tab; label: string; icon: typeof Flame }[] = [
  { id: "checkin", label: "Today", icon: Flame },
  { id: "coach", label: "Wingmate", icon: MessageCircle },
  { id: "stats", label: "Stats", icon: BarChart3 },
  { id: "community", label: "Community", icon: Users },
  { id: "plans", label: "Plans", icon: Crown },
];

function useActiveTab(): { active: Tab | null; isProfile: boolean } {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  if (pathname === "/profile") return { active: null, isProfile: true };
  if (pathname === "/plans") return { active: "plans", isProfile: false };
  if (pathname.startsWith("/community")) return { active: "community", isProfile: false };
  if (pathname === "/") {
    const t = searchParams.get("tab");
    if (t && (["checkin", "coach", "stats", "community", "plans"] as const).includes(t as Tab)) {
      return { active: t as Tab, isProfile: false };
    }
    return { active: "checkin", isProfile: false };
  }
  return { active: null, isProfile: false };
}

export default function BottomNavBar() {
  const { active, isProfile } = useActiveTab();
  const [sab, setSab] = useState(0);

  // Snapshot env(safe-area-inset-bottom) on mount. The painted gray strip is
  // the color behind Android's transparent system nav bar (edge-to-edge on
  // targetSdk 36 ignores android:navigationBarColor).
  useEffect(() => {
    const probe = document.createElement("div");
    probe.style.cssText = "position:absolute;visibility:hidden;padding-bottom:env(safe-area-inset-bottom)";
    document.body.appendChild(probe);
    const measured = parseFloat(getComputedStyle(probe).paddingBottom) || 0;
    document.body.removeChild(probe);
    setSab(measured);
  }, []);

  return (
    <nav className="shrink-0">
      <div className="bg-bg border-t border-border shadow-nav">
        <div className="max-w-md mx-auto flex items-center justify-around py-2">
          {tabs.map(({ id, label, icon: Icon }) => {
            const isActive = !isProfile && active === id;
            return (
              <Link
                key={id}
                href={`/?tab=${id}`}
                replace
                className={`flex flex-col items-center gap-0.5 px-4 py-1 press transition-colors ${
                  isActive ? "text-text" : "text-text-muted/50"
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
          <Link
            href="/profile"
            className={`flex flex-col items-center gap-0.5 px-4 py-1 press transition-colors ${
              isProfile ? "text-text" : "text-text-muted/50"
            }`}
          >
            <User size={20} strokeWidth={isProfile ? 2 : 1.5} />
            <span className="text-[10px] font-medium">Profile</span>
          </Link>
        </div>
      </div>
      <div style={{ height: sab, background: "#374151" }} />
    </nav>
  );
}
