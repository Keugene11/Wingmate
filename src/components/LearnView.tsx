import Link from "next/link";
import { ChevronRight, BookOpen } from "lucide-react";

type Article = {
  slug: string;
  title: string;
  blurb: string;
  available: boolean;
};

const articles: Article[] = [
  {
    slug: "cold-reads",
    title: "Cold reads",
    blurb: "Confident statements that fake intimacy and install frame.",
    available: true,
  },
  {
    slug: "compliance-tests",
    title: "Compliance tests",
    blurb: "Tiny asks that quietly decide who's leading and who's following.",
    available: true,
  },
  {
    slug: "negs",
    title: "Negs",
    blurb: "Backhanded compliments that level the playing field.",
    available: false,
  },
  {
    slug: "dhv",
    title: "DHV",
    blurb: "Demonstrating higher value without bragging.",
    available: false,
  },
  {
    slug: "push-pull",
    title: "Push-pull",
    blurb: "Alternating warmth and challenge to spike attraction.",
    available: false,
  },
  {
    slug: "kino-escalation",
    title: "Kino escalation",
    blurb: "Building physical comfort step by step.",
    available: false,
  },
];

export default function LearnView() {
  return (
    <div className="animate-fade-in">
      <h1 className="font-display text-[28px] font-bold tracking-tight mb-2">Learn</h1>
      <p className="text-text/70 text-[15px] mb-6">
        PUA mechanics, decoded for real life.
      </p>

      <div className="bg-[#1a1a1a] text-white rounded-2xl px-5 py-5 mb-6 flex items-start gap-3.5">
        <BookOpen size={18} strokeWidth={2} className="shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-[14px] mb-1">PUA mechanics, human delivery</p>
          <p className="text-white/70 text-[13px] leading-relaxed">
            Short reads on classic game concepts — what they are, why they work,
            and how they should actually sound.
          </p>
        </div>
      </div>

      <div className="space-y-2 stagger">
        {articles.map((a) =>
          a.available ? (
            <Link
              key={a.slug}
              href={`/learn/${a.slug}`}
              className="flex items-center gap-3.5 w-full bg-bg-card border border-border rounded-xl shadow-card px-4 py-3.5 press"
            >
              <div className="flex-1">
                <p className="font-semibold text-[15px] mb-0.5">{a.title}</p>
                <p className="text-text/70 text-[13px] leading-snug">{a.blurb}</p>
              </div>
              <ChevronRight size={16} className="text-border shrink-0" />
            </Link>
          ) : (
            <div
              key={a.slug}
              className="flex items-center gap-3.5 w-full bg-bg-card border border-border rounded-xl shadow-card px-4 py-3.5 opacity-60"
            >
              <div className="flex-1">
                <p className="font-semibold text-[15px] mb-0.5">{a.title}</p>
                <p className="text-text/70 text-[13px] leading-snug">{a.blurb}</p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-muted shrink-0">
                Soon
              </span>
            </div>
          )
        )}
      </div>
    </div>
  );
}
