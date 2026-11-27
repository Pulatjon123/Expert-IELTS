"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, RotateCcw, X, Gauge } from "lucide-react";
import { HOME_TEXT, quizBand } from "@/lib/home-content";
import type { Locale } from "@/lib/i18n/dict";

/** A 5-question level check that runs entirely in the browser (no account, no AI). */
export function LevelQuiz({ locale, loggedIn }: { locale: Locale; loggedIn: boolean }) {
  const c = HOME_TEXT[locale].quiz;
  const qs = c.questions;
  const [idx, setIdx] = useState(-1); // -1 = intro, qs.length = result
  const [correct, setCorrect] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);

  function pick(i: number) {
    if (picked !== null) return;
    setPicked(i);
    const right = i === qs[idx].answer;
    window.setTimeout(() => {
      if (right) setCorrect((n) => n + 1);
      setPicked(null);
      setIdx((n) => n + 1);
    }, 750);
  }

  function restart() {
    setCorrect(0);
    setPicked(null);
    setIdx(0);
  }

  return (
    <div className="flex h-full flex-col rounded-3xl border border-border bg-surface p-6 sm:p-7">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
          <Gauge className="h-5 w-5" />
        </span>
        <div>
          <h3 className="font-display text-xl font-semibold">{c.title}</h3>
          <p className="text-sm text-muted">{c.subtitle}</p>
        </div>
      </div>

      {idx === -1 && (
        <div className="mt-6 flex flex-1 items-end">
          <button onClick={() => setIdx(0)} className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 font-medium text-primary-fg hover:bg-primary-hover">
            {c.start} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {idx >= 0 && idx < qs.length && (
        <div className="mt-6">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>{c.questionOf(idx + 1, qs.length)}</span>
            <span className="flex gap-1">
              {qs.map((_, i) => (
                <span key={i} className={`h-1.5 w-6 rounded-full ${i < idx ? "bg-primary" : i === idx ? "bg-primary/50" : "bg-surface-2"}`} />
              ))}
            </span>
          </div>
          <p className="mt-4 font-medium">{qs[idx].q}</p>
          <div className="mt-4 grid gap-2">
            {qs[idx].options.map((o, i) => {
              const isAnswer = i === qs[idx].answer;
              const state = picked === null ? "" : isAnswer ? "border-success bg-success-soft" : picked === i ? "border-danger bg-danger-soft" : "opacity-60";
              return (
                <button
                  key={o}
                  onClick={() => pick(i)}
                  disabled={picked !== null}
                  className={`flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 text-left text-sm transition hover:border-primary/40 hover:bg-surface-2 ${state}`}
                >
                  {o}
                  {picked !== null && isAnswer && <Check className="h-4 w-4 shrink-0 text-success" />}
                  {picked === i && !isAnswer && <X className="h-4 w-4 shrink-0 text-danger" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {idx >= qs.length && (
        <div className="mt-6">
          <p className="text-sm text-muted">{c.resultTitle}</p>
          <p className="mt-1 font-display text-4xl font-semibold text-primary">≈ {quizBand(correct)}</p>
          <p className="mt-1 text-sm">{c.score(correct, qs.length)}</p>
          <p className="mt-3 text-xs text-muted">{c.resultNote}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={loggedIn ? "/writing" : "/register"} className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 font-medium text-primary-fg hover:bg-primary-hover">
              {c.cta} <ArrowRight className="h-4 w-4" />
            </Link>
            <button onClick={restart} className="inline-flex h-11 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium hover:bg-surface-2">
              <RotateCcw className="h-4 w-4" /> {c.retry}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
