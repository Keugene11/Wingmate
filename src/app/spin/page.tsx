"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Segment labels in clockwise order, starting from the segment whose
// center sits at 12 o'clock (0°). The wheel always lands on "80%" — the
// final rotation is calculated to place that segment under the pointer.
const SEGMENTS = ["10%", "30%", "50%", "65%", "20%", "40%", "80%", "70%"];
const TARGET_INDEX = 6;
const SEGMENT_DEG = 360 / SEGMENTS.length;

export default function SpinPage() {
  const router = useRouter();
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [done, setDone] = useState(false);

  // Burn the one-shot eligibility flag the moment the page loads, so a
  // refresh / direct revisit can't re-trigger the offer.
  useEffect(() => {
    fetch("/api/winback/mark-shown", { method: "POST" }).catch(() => {});
  }, []);

  // Auto-spin shortly after mount.
  useEffect(() => {
    const t = setTimeout(() => {
      setSpinning(true);
      // Land the target segment at the pointer (12 o'clock). Segment i's
      // local center is at i * SEGMENT_DEG; rotating the wheel by -that
      // places it at the top. Add 6 full spins for the drama.
      const final = 360 * 6 + (360 - TARGET_INDEX * SEGMENT_DEG);
      setAngle(final);
    }, 600);
    return () => clearTimeout(t);
  }, []);

  // Mark "done" after the CSS transition completes so the result + CTA can fade in.
  useEffect(() => {
    if (!spinning) return;
    const t = setTimeout(() => setDone(true), 4200);
    return () => clearTimeout(t);
  }, [spinning]);

  return (
    <main className="min-h-app max-w-lg mx-auto px-6 pb-24 flex flex-col items-center animate-fade-in">
      <div className="text-center mt-12 mb-8">
        <h1 className="font-display text-[28px] font-extrabold tracking-tight leading-[1.1] mb-3">
          Wait — spin to unlock<br />an exclusive discount
        </h1>
        <p className="text-text-muted text-[15px] leading-relaxed max-w-[320px] mx-auto">
          One spin, one chance. Whatever you land on is yours.
        </p>
      </div>

      <div className="relative w-[320px] h-[320px] mb-10">
        {/* Pointer */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-1 z-10">
          <div className="w-0 h-0 border-l-[14px] border-r-[14px] border-t-[22px] border-l-transparent border-r-transparent border-t-[#1a1a1a]" />
        </div>

        {/* Wheel */}
        <div
          className="absolute inset-0 rounded-full shadow-card border border-border overflow-hidden"
          style={{
            transform: `rotate(${angle}deg)`,
            transition: spinning
              ? "transform 4s cubic-bezier(0.17, 0.67, 0.21, 1)"
              : "none",
          }}
        >
          <svg viewBox="0 0 200 200" className="w-full h-full">
            {SEGMENTS.map((label, i) => {
              const startA = (i - 0.5) * SEGMENT_DEG - 90;
              const endA = (i + 0.5) * SEGMENT_DEG - 90;
              const r = 100;
              const x1 = 100 + r * Math.cos((startA * Math.PI) / 180);
              const y1 = 100 + r * Math.sin((startA * Math.PI) / 180);
              const x2 = 100 + r * Math.cos((endA * Math.PI) / 180);
              const y2 = 100 + r * Math.sin((endA * Math.PI) / 180);
              const path = `M100,100 L${x1},${y1} A${r},${r} 0 0,1 ${x2},${y2} Z`;
              const isTarget = i === TARGET_INDEX;
              const fill = isTarget ? "#1a1a1a" : i % 2 === 0 ? "#ffffff" : "#f0f0f0";
              const textColor = isTarget ? "#ffffff" : "#1a1a1a";
              const labelA = i * SEGMENT_DEG - 90;
              const labelR = 65;
              const tx = 100 + labelR * Math.cos((labelA * Math.PI) / 180);
              const ty = 100 + labelR * Math.sin((labelA * Math.PI) / 180);
              return (
                <g key={i}>
                  <path d={path} fill={fill} stroke="#1a1a1a" strokeWidth="0.5" />
                  <text
                    x={tx}
                    y={ty}
                    fill={textColor}
                    fontSize="14"
                    fontWeight="700"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${labelA + 90}, ${tx}, ${ty})`}
                  >
                    {label}
                  </text>
                </g>
              );
            })}
            <circle cx="100" cy="100" r="10" fill="#1a1a1a" />
          </svg>
        </div>
      </div>

      {done ? (
        <div className="text-center animate-fade-in w-full">
          <p className="text-text-muted text-[13px] uppercase tracking-wider font-semibold mb-2">
            You won
          </p>
          <p className="font-display text-[52px] font-extrabold tracking-tight leading-none mb-8">
            80% off
          </p>
          <button
            onClick={() => router.replace("/winback-offer")}
            className="w-full max-w-sm mx-auto block py-4 rounded-xl bg-[#1a1a1a] text-white text-[15px] font-bold press"
          >
            Claim my discount
          </button>
        </div>
      ) : (
        <p className="text-text-muted text-[14px] mt-4">Spinning...</p>
      )}
    </main>
  );
}
