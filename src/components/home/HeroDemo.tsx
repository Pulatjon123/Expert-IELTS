"use client";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { HOME_TEXT } from "@/lib/home-content";
import type { Locale } from "@/lib/i18n/dict";

type Seg = string | { wrong: string; fix: string; kind: "grammar" | "vocab" };

// A scripted example — no AI call is made.
const SEGMENTS: Seg[] = [
  "Nowadays many people ",
  { wrong: "thinks", fix: "believe", kind: "vocab" },
  " that technology ",
  { wrong: "make", fix: "makes", kind: "grammar" },
  " our ",
  { wrong: "life", fix: "lives", kind: "grammar" },
  " ",
  { wrong: "more easier", fix: "considerably easier", kind: "grammar" },
  ".",
];
const MARKS = SEGMENTS.filter((s) => typeof s !== "string").length; // 4
const FINAL = MARKS + 1; // the step where the improved sentence + band appear
const CYCLE = FINAL + 4; // hold the final state for a few beats, then loop

export function HeroDemo({ locale }: { locale: Locale }) {
  const c = HOME_TEXT[locale].demo;
  const [step, setStep] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduced(rm);
    if (rm) {
      setStep(FINAL);
      return;
    }
    const id = window.setInterval(() => setStep((s) => (s + 1) % CYCLE), 1200);
    return () => window.clearInterval(id);
  }, []);

  const shown = reduced ? FINAL : Math.min(step, FINAL);
  const done = shown >= FINAL;
  const band = done ? 7.0 : 5.5;
  const R = 34;
  const C = 2 * Math.PI * R;
  let markIndex = 0;

  return (
    <div className="relative rounded-3xl border border-border bg-surface p-6 shadow-xl shadow-primary/5 sm:p-7">
      <div className="flex items-center justify-between gap-4">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
          <Sparkles className="h-3.5 w-3.5 text-accent" /> {c.label}
        </p>
        <div className="flex gap-3 text-[11px] text-muted">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-danger" />{c.grammar}</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-warning" />{c.vocab}</span>
        </div>
      </div>

      <p className="mt-5 text-[17px] leading-[2.4]">
        {SEGMENTS.map((s, i) => {
          if (typeof s === "string") return <span key={i}>{s}</span>;
          const n = ++markIndex;
          const on = shown >= n;
          return (
            <span key={i} className="relative inline-block">
              <span
                className={`absolute -top-5 left-0 whitespace-nowrap text-[11px] font-semibold transition-all duration-500 ${on ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"} ${s.kind === "grammar" ? "text-danger" : "text-warning"}`}
              >
                {s.fix}
              </span>
              <span className={`rounded px-0.5 transition-colors duration-500 ${on ? (s.kind === "grammar" ? "mark-grammar" : "mark-vocab") : ""}`}>{s.wrong}</span>
            </span>
          );
        })}
      </p>

      <div className="mt-5 flex items-center gap-5 border-t border-border pt-5">
        <div className="relative h-20 w-20 shrink-0">
          <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
            <circle cx="40" cy="40" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="7" />
            <circle
              cx="40"
              cy="40"
              r={R}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - band / 9)}
              style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.2,0.7,0.2,1)" }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <div className="font-display text-xl font-semibold leading-none">{band.toFixed(1)}</div>
              <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted">{c.band}</div>
            </div>
          </div>
        </div>
        <p className={`text-sm leading-relaxed transition-all duration-700 ${done ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"}`}>
          <span className="mark-good px-0.5">{c.after}</span>
        </p>
      </div>
      <p className="mt-4 text-[11px] text-muted">{c.estimate}</p>
    </div>
  );
}
