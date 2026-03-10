"use client";

import { Flame, MessageCircle, Users, User } from "lucide-react";
import Link from "next/link";

export type Tab = "checkin" | "coach" | "community";

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const tabs: { id: Tab; label: string; icon: typeof Flame }[] = [
  { id: "checkin", label: "Check-in", icon: Flame },
  { id: "coach", label: "Coach", icon: MessageCircle },
  { id: "community", label: "Community", icon: Users },
];

export default function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-bg border-t border-border z-50">
      <div className="max-w-md mx-auto flex items-center justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`flex flex-col items-center gap-0.5 px-4 py-1 press transition-colors ${
              active === id ? "text-text" : "text-text-muted/50"
            }`}
          >
            <Icon size={20} strokeWidth={active === id ? 2 : 1.5} />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
        <Link
          href="/profile"
          className="flex flex-col items-center gap-0.5 px-4 py-1 press text-text-muted/50"
        >
          <User size={20} strokeWidth={1.5} />
          <span className="text-[10px] font-medium">Profile</span>
        </Link>
      </div>
    </nav>
  );
}
