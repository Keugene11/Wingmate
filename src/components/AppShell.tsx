"use client";

import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import BottomNavBar from "./BottomNav";

// Track the soft-keyboard height as --kb-h on <html> so any fixed-bottom
// element can lift itself above the keyboard via
// `bottom: calc(env(safe-area-inset-bottom) + var(--kb-h, 0px))`.
//
// The shipped public APK has neither resizeOnFullScreen nor adjustResize, so
// the WebView stays full-height when the keyboard opens — meaning fixed
// elements pinned to the bottom (community comment input, modals, etc.)
// render behind it. Capacitor's keyboardDidShow plugin event fires on both
// iOS and Android with info.keyboardHeight, which is the only reliable
// signal we get on the public app. On the web we fall back to visualViewport.
function useKeyboardCssVar() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    const setHeight = (px: number) => {
      root.style.setProperty("--kb-h", `${Math.max(0, Math.round(px))}px`);
    };
    setHeight(0);

    if (window.Capacitor?.isNativePlatform()) {
      const handles: { remove: () => Promise<void> }[] = [];
      let cancelled = false;
      (async () => {
        try {
          const { Keyboard } = await import("@capacitor/keyboard");
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const onShow = (info: any) => setHeight(info?.keyboardHeight ?? 0);
          const onHide = () => setHeight(0);
          const subs = await Promise.all([
            Keyboard.addListener("keyboardWillShow", onShow),
            Keyboard.addListener("keyboardDidShow", onShow),
            Keyboard.addListener("keyboardWillHide", onHide),
            Keyboard.addListener("keyboardDidHide", onHide),
          ]);
          if (cancelled) subs.forEach((s) => s.remove());
          else handles.push(...subs);
        } catch {}
      })();
      return () => {
        cancelled = true;
        handles.forEach((h) => h.remove());
        setHeight(0);
      };
    }

    if (window.visualViewport) {
      const vv = window.visualViewport;
      const onResize = () => setHeight(window.innerHeight - vv.height);
      vv.addEventListener("resize", onResize);
      vv.addEventListener("scroll", onResize);
      return () => {
        vv.removeEventListener("resize", onResize);
        vv.removeEventListener("scroll", onResize);
      };
    }
  }, []);
}

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
  useKeyboardCssVar();
  return (
    <div id="app-shell" className="flex flex-col h-full">
      <div
        aria-hidden
        className="shrink-0 bg-bg"
        style={{ height: "env(safe-area-inset-top)" }}
      />
      <div
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
        style={{ paddingBottom: "var(--kb-h, 0px)" }}
      >
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
