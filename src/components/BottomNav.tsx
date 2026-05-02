"use client";

import { Flame, MessageCircle, Users, User, BookOpen } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export type Tab = "checkin" | "coach" | "learn" | "community" | "plans";

const tabs: { id: Tab; label: string; icon: typeof Flame }[] = [
  { id: "checkin", label: "Today", icon: Flame },
  { id: "coach", label: "Wingmate", icon: MessageCircle },
  { id: "learn", label: "Learn", icon: BookOpen },
  { id: "community", label: "Community", icon: Users },
];

function useActiveTab(): { active: Tab | null; isProfile: boolean } {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  if (pathname === "/profile" || pathname.startsWith("/profile/")) return { active: null, isProfile: true };
  if (pathname === "/plans") return { active: "plans", isProfile: false };
  if (pathname.startsWith("/community")) return { active: "community", isProfile: false };
  if (pathname.startsWith("/learn")) return { active: "learn", isProfile: false };
  if (pathname === "/") {
    const t = searchParams.get("tab");
    if (t && (["checkin", "coach", "learn", "community", "plans"] as const).includes(t as Tab)) {
      return { active: t as Tab, isProfile: false };
    }
    return { active: "checkin", isProfile: false };
  }
  return { active: null, isProfile: false };
}

export default function BottomNavBar() {
  const { active, isProfile } = useActiveTab();

  return (
    <nav className="shrink-0 bg-bg border-t border-border shadow-nav">
      <div className="bg-bg">
        <div className="max-w-md mx-auto flex items-center justify-around">
          {tabs.map(({ id, label, icon: Icon }) => {
            const isActive = !isProfile && active === id;
            return (
              <Link
                key={id}
                href={`/?tab=${id}`}
                replace
                className={`flex flex-col items-center gap-0.5 px-4 py-1.5 press transition-colors ${
                  isActive ? "text-text" : "text-text-muted"
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.25 : 1.75} />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
          <Link
            href="/profile"
            className={`flex flex-col items-center gap-0.5 px-4 py-1.5 press transition-colors ${
              isProfile ? "text-text" : "text-text-muted"
            }`}
          >
            <User size={20} strokeWidth={isProfile ? 2.25 : 1.75} />
            <span className="text-[10px] font-medium">Profile</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
