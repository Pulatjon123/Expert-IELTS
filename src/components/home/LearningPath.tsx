"use client";
import { useEffect, useRef, useState } from "react";
import { HOME_TEXT } from "@/lib/home-content";
import type { Locale } from "@/lib/i18n/dict";

/** The 8-step learning cycle; steps light up one after another when the section scrolls into view. */
export function LearningPath({ locale }: { locale: Locale }) {
  const c = HOME_TEXT[locale].path;
  const ref = useRef<HTMLDivElement>(null);
  const [lit, setLit] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const total = c.steps.length;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || typeof IntersectionObserver === "undefined") {
      setLit(total);
      return;
    }
    let timer: number | undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        let n = 0;
        timer = window.setInterval(() => {
          n += 1;
          setLit(n);
          if (n >= total) window.clearInterval(timer);
        }, 220);
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (timer) window.clearInterval(timer);
    };
  }, [c.steps.length]);

  return (
    <section ref={ref} className="mt-24">
      <div className="text-center">
        <h2 className="font-display text-3xl font-semibold sm:text-4xl">{c.title}</h2>
        <p className="mt-2 text-muted">{c.subtitle}</p>
      </div>
      <ol className="relative mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {c.steps.map((s, i) => {
          const on = i < lit;
          return (
            <li
              key={s.title}
              className={`rounded-2xl border p-5 transition-all duration-500 ${on ? "border-primary/30 bg-surface shadow-sm" : "border-border bg-surface/60"}`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-semibold transition-colors duration-500 ${on ? "bg-primary text-primary-fg" : "bg-surface-2 text-muted"}`}
                >
                  {i + 1}
                </span>
                <h3 className="font-semibold">{s.title}</h3>
              </div>
              <p className="mt-2 text-sm text-muted">{s.desc}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
