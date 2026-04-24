"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import StatsView from "@/components/StatsView";

export default function ProfileStatsPage() {
  const { status } = useSession();
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/stripe/status")
      .then((r) => r.json())
      .then((d) => setIsPro(d.subscription?.status === "active"))
      .catch(() => {});
  }, [status]);

  return (
    <main className="min-h-app max-w-md mx-auto px-5 pt-6 pb-24 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/profile" className="p-1 -ml-1 press">
          <ArrowLeft size={20} strokeWidth={1.5} />
        </Link>
        <h1 className="font-display text-[20px] font-bold tracking-tight">Stats</h1>
      </div>
      <StatsView isPro={isPro} />
    </main>
  );
}
