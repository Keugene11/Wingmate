"use client";

import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
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
  // Hide on community sub-routes (post detail, new post, user profile).
  // These have their own back nav and — on detail — a fixed comment input
  // that would otherwise be covered by the BottomNav.
  if (pathname.startsWith("/community/")) return false;
  return true;
}

// Structures the app as a static-height flex column: scrollable content on
// top, BottomNav on the bottom as a flex child (NOT position:fixed).
// The viewport-tied fixed positioning was what let Android's dynamic inset
// slide the nav around during scroll; a flex child can't do that.
//
// Top safe-area is painted by a fixed-height <div> in bg-bg above the scroll,
// so the status-bar inset matches the app bg seamlessly instead of showing
// a separate strip. The BottomNav handles its own bottom safe-area; on
// nav-less screens we fall back to a similar bg-bg filler at the bottom.
export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div id="app-shell" className="flex flex-col h-full">
      <div
        aria-hidden
        className="shrink-0 bg-bg"
        style={{ height: "env(safe-area-inset-top)" }}
      />
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {children}
      </div>
      <Suspense fallback={null}>
        <NavSlot />
      </Suspense>
    </div>
  );
}

function useKeyboardOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;
    let baseline = vv.height;
    const onResize = () => {
      // Track the tallest viewport we've seen as the no-keyboard baseline,
      // then treat a drop of >150px as the keyboard opening.
      if (vv.height > baseline) baseline = vv.height;
      setOpen(vv.height < baseline - 150);
    };
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);
  return open;
}

function NavSlot() {
  const pathname = usePathname();
  const keyboardOpen = useKeyboardOpen();
  if (!shouldShowNav(pathname) || keyboardOpen) {
    // No BottomNav on this screen — still need a bg-bg strip at the
    // bottom safe-area so the home-indicator region matches the app bg.
    return (
      <div
        aria-hidden
        className="shrink-0 bg-bg"
        style={{ height: "env(safe-area-inset-bottom)" }}
      />
    );
  }
  return <BottomNavBar />;
}
