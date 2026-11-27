"use client";
import { useState } from "react";
import { BookOpen, RotateCw } from "lucide-react";
import { HOME_TEXT, type DailyWord } from "@/lib/home-content";
import type { Locale } from "@/lib/i18n/dict";

/** Word of the day: the word on the front, Uzbek meaning and an example on the back. */
export function WordCard({ locale, word }: { locale: Locale; word: DailyWord }) {
  const c = HOME_TEXT[locale].word;
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setFlipped((f) => !f)}
      aria-pressed={flipped}
      className={`flip block h-full min-h-72 w-full text-left ${flipped ? "is-flipped" : ""}`}
    >
      <div className="flip-inner h-full min-h-72">
        <div className="flip-face flex h-full min-h-72 flex-col rounded-3xl border border-border bg-primary p-6 text-primary-fg sm:p-7">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider opacity-80">
            <BookOpen className="h-3.5 w-3.5" /> {c.title}
          </p>
          <div className="flex flex-1 flex-col justify-center">
            <p className="font-display text-4xl font-semibold sm:text-5xl">{word.word}</p>
            <p className="mt-2 text-sm italic opacity-80">{word.kind}</p>
          </div>
          <p className="inline-flex items-center gap-2 text-xs opacity-80">
            <RotateCw className="h-3.5 w-3.5" /> {c.tapHint}
          </p>
        </div>
        <div className="flip-face flip-back flex flex-col rounded-3xl border border-border bg-surface p-6 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">{c.translation}</p>
          <p className="mt-1 font-display text-2xl font-semibold text-primary">{word.uz}</p>
          <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-muted">{c.example}</p>
          <p className="mt-1 leading-relaxed">“{word.example}”</p>
          <p className="mt-auto inline-flex items-center gap-2 pt-4 text-xs text-muted">
            <RotateCw className="h-3.5 w-3.5" /> {c.back}
          </p>
        </div>
      </div>
    </button>
  );
}
