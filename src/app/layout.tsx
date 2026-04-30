import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import Providers from "@/components/Providers";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Wingmate",
  description: "AI-powered confidence coach for cold approaches. Get motivated, get a game plan, and go talk to her.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Wingmate",
  },
};

export const viewport: Viewport = {
  themeColor: "#1a1a1a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* icon + apple-icon are picked up by Next.js's icon convention from
            src/app/icon.png and src/app/apple-icon.png — hashed filenames bust
            Chrome's favicon cache automatically. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="antialiased">
        {/* Tag <html> with the Capacitor platform so CSS can scope styles
            (e.g. the Android-only edge-to-edge nav-bar gray) before paint. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=(window.Capacitor&&window.Capacitor.getPlatform&&window.Capacitor.getPlatform())||'web';document.documentElement.classList.add('platform-'+p)}catch(e){}})();`,
          }}
        />
        {/* Safety net: hide splash after 4s even if React fails to mount */}
        <script
          dangerouslySetInnerHTML={{
            __html: `setTimeout(function(){try{window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.SplashScreen&&window.Capacitor.Plugins.SplashScreen.hide({fadeOutDuration:200})}catch(e){}},4000);`,
          }}
        />
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
        <Analytics />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
