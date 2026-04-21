"use client";

import { usePathname } from "next/navigation";
import { Suspense } from "react";
import BottomNavBar from "./BottomNav";

// Paths where the bottom nav should NOT render.
const NAV_HIDDEN_PATHS = new Set([
  "/onboarding",
  "/delete-account",
  "/terms",
  "/privacy",
  "/offline",
]);

function shouldShowNav(pathname: string) {
  if (NAV_HIDDEN_PATHS.has(pathname)) return false;
  // Nested community routes (e.g. /community/new, /community/[id]) still want
  // the nav — they fall through to true.
  return true;
}

// Structures the app as a static-height flex column: scrollable content on
// top, BottomNav on the bottom as a flex child (NOT position:fixed).
// The viewport-tied fixed positioning was what let Android's dynamic inset
// slide the nav around during scroll; a flex child can't do that.
export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {children}
      </div>
      <Suspense fallback={null}>
        <NavSlot />
      </Suspense>
    </div>
  );
}

function NavSlot() {
  const pathname = usePathname();
  if (!shouldShowNav(pathname)) return null;
  return <BottomNavBar />;
}
