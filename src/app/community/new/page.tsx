"use client";

import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function NewPostPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isPro, setIsPro] = useState<boolean | null>(true); // TODO: temp override for demo
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetch("/api/stripe/status")
      .then((res) => res.json())
      .then((d) => {
        if (!d.subscribed) router.replace("/?tab=plans");
        else setIsPro(true);
      })
      .catch(() => router.replace("/?tab=plans"));
  }, [router]);

  const canSubmit = title.trim().length > 0 && body.trim().length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const meta = user.user_metadata;
    const fullName = meta?.full_name || meta?.name || "Anonymous";
    const firstName = fullName.split(" ")[0];

    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      author_name: firstName,
      title: title.trim(),
      body: body.trim(),
    });

    if (error) {
      setSubmitting(false);
      return;
    }

    router.push("/");
  };

  if (!isPro) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen max-w-md mx-auto px-5 pt-6 pb-10 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-1 -ml-1 press">
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

      {/* Form */}
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 120))}
          className="w-full bg-bg-card border border-border rounded-xl shadow-card px-4 py-3.5 text-[16px] font-medium placeholder:text-text-muted/50 outline-none focus:border-text-muted transition-colors"
        />
        <textarea
          placeholder="Share your experience..."
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, 2000))}
          rows={8}
          className="w-full bg-bg-card border border-border rounded-xl shadow-card px-4 py-3.5 text-[15px] leading-relaxed placeholder:text-text-muted/50 outline-none focus:border-text-muted transition-colors resize-none"
        />
        <p className="text-[12px] text-text-muted text-right">{body.length}/2000</p>
      </div>
    </main>
  );
}
