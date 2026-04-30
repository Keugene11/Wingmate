"use client";

import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NewPostPage() {
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isPro, setIsPro] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/stripe/status")
      .then((res) => res.json())
      .then((d) => {
        if (!d.subscribed) router.replace("/?tab=plans");
        else setIsPro(true);
      })
      .catch(() => router.replace("/?tab=plans"));
  }, [router]);

  const canSubmit = body.trim().length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });

      if (!res.ok) {
        setSubmitting(false);
        return;
      }

      router.push("/?tab=community");
    } catch {
      setSubmitting(false);
    }
  };

  if (!isPro) {
    return (
      <main className="min-h-app flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="h-app max-w-md mx-auto px-5 pt-6 pb-4 flex flex-col animate-fade-in">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/?tab=community" className="p-1 -ml-1 press">
            <ArrowLeft size={20} strokeWidth={1.5} />
          </Link>
          <h1 className="font-display text-[20px] font-bold tracking-tight">New post</h1>
        </div>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`h-9 px-4 rounded-full text-[13px] font-medium press transition-opacity ${
            canSubmit
              ? "bg-[#1a1a1a] text-white"
              : "bg-border text-text-muted opacity-50 cursor-not-allowed"
          }`}
        >
          {submitting ? "Posting..." : "Post"}
        </button>
      </div>

      <textarea
        placeholder="What's on your mind?"
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, 2000))}
        autoFocus
        className="flex-1 min-h-0 w-full bg-bg-card border border-border rounded-xl shadow-card px-4 py-3.5 text-[16px] leading-relaxed placeholder:text-text-muted/50 outline-none focus:border-text-muted transition-colors resize-none"
      />
      <p className="text-[12px] text-text-muted text-right mt-2 shrink-0">{body.length}/2000</p>
    </main>
  );
}
