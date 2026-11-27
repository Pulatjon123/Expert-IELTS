"use client";
import { useState } from "react";
import { Columns3, Layers, Sparkles } from "lucide-react";
import { Alert, Button, Card, cn } from "./ui";
import { Highlighted } from "./Highlighted";
import { api, ApiError } from "@/lib/fetcher";
import type { Comparison } from "@/lib/ai/compare";

const TONE: Record<number, string> = { 6: "text-warning", 7: "text-primary", 8: "text-success" };

export function BandCompare({
  skill,
  id,
  index = 0,
  initial,
  aiConfigured,
}: {
  skill: "WRITING" | "SPEAKING";
  id: string;
  index?: number;
  initial: Comparison | null;
  aiConfigured: boolean;
}) {
  const [data, setData] = useState(initial);
  const [band, setBand] = useState(7);
  const [side, setSide] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ msg: string; code?: string } | null>(null);

  if (!data) {
    return (
      <Card className="p-8 text-center">
        <Layers className="mx-auto h-8 w-8 text-accent" />
        <p className="mt-3 font-semibold">Band 6, 7 and 8 answers to this question</p>
        <p className="mx-auto mt-1 max-w-lg text-sm text-muted">See how the same question is answered at three levels, with what holds each answer back and what makes the next one stronger highlighted.</p>
        {error && (
          <div className="mx-auto mt-3 max-w-lg text-left">
            <Alert tone={error.code ? "warning" : "danger"}>{error.msg}</Alert>
          </div>
        )}
        <Button
          className="mt-5"
          size="lg"
          loading={loading}
          disabled={!aiConfigured}
          onClick={async () => {
            setLoading(true);
            setError(null);
            try {
              setData((await api<{ comparison: Comparison }>("/api/compare", { method: "POST", json: { skill, id, index } })).comparison);
            } catch (e) {
              setError({ msg: (e as Error).message, code: e instanceof ApiError ? e.code : undefined });
            } finally {
              setLoading(false);
            }
          }}
        >
          <Sparkles className="h-4 w-4" /> Generate comparison
        </Button>
        {!aiConfigured && <p className="mt-2 text-xs text-warning">The Claude AI service is not configured on this server yet.</p>}
        {loading && <p className="mt-2 text-xs text-muted">Writing three answers… this can take up to a minute the first time. After that it is instant for everyone.</p>}
      </Card>
    );
  }

  const answerCard = (b: number) => {
    const a = data.answers.find((x) => x.band === b)!;
    const marks = data.highlights.filter((h) => h.band === b).map((h) => ({ text: h.text, kind: h.kind, note: h.note }));
    return (
      <Card key={b} className="p-5">
        <p className={cn("font-display text-2xl font-semibold", TONE[b])}>Band {b}</p>
        <p className="mt-1 text-sm text-muted">{a.verdict}</p>
        <Highlighted source={a.text} marks={marks} className="mt-4 whitespace-pre-line font-serif text-[16px] leading-7" />
        {marks.length > 0 && (
          <ul className="mt-4 space-y-1.5 text-sm">
            {marks.map((m, i) => (
              <li key={i} className="flex gap-2">
                <mark className={`mark-${m.kind} shrink-0 text-inherit`}>{m.text.length > 40 ? `${m.text.slice(0, 40)}…` : m.text}</mark>
                <span className="text-muted">{m.note}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-xl bg-surface-2 p-1">
          {[6, 7, 8].map((b) => (
            <button
              key={b}
              onClick={() => {
                setBand(b);
                setSide(false);
              }}
              className={cn("rounded-lg px-4 py-2 text-sm font-semibold", !side && band === b ? "bg-surface shadow-sm" : "text-muted hover:text-text")}
            >
              Band {b}
            </button>
          ))}
        </div>
        <Button variant={side ? "primary" : "secondary"} onClick={() => setSide((s) => !s)}>
          <Columns3 className="h-4 w-4" /> Side by side
        </Button>
        <span className="flex gap-3 text-xs text-muted">
          <span><mark className="mark-limit text-inherit">holds it back</mark></span>
          <span><mark className="mark-feature text-inherit">makes it stronger</mark></span>
        </span>
      </div>
      {side ? <div className="grid gap-4 xl:grid-cols-3">{[6, 7, 8].map(answerCard)}</div> : answerCard(band)}

      <div className="grid gap-4 md:grid-cols-3">
        {(
          [
            ["Why the Band 6 answer is limited", data.why6Limited, "text-warning"],
            ["What makes the Band 7 answer stronger", data.why7Stronger, "text-primary"],
            ["What makes the Band 8 answer more sophisticated", data.why8Sophisticated, "text-success"],
          ] as const
        ).map(([title, items, cls]) => (
          <Card key={title} className="p-5">
            <h3 className={cn("font-semibold", cls)}>{title}</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </Card>
        ))}
      </div>

      <Card className="overflow-x-auto p-5">
        <h3 className="font-semibold">Dimension by dimension</h3>
        <table className="mt-3 w-full min-w-[640px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="w-40 py-2">Dimension</th>
              <th className="text-warning">Band 6</th>
              <th className="text-primary">Band 7</th>
              <th className="text-success">Band 8</th>
            </tr>
          </thead>
          <tbody>
            {data.dimensions.map((d) => (
              <tr key={d.name} className="border-t border-border align-top">
                <td className="py-2.5 pr-3 font-medium">{d.name}</td>
                <td className="py-2.5 pr-3">{d.band6}</td>
                <td className="py-2.5 pr-3">{d.band7}</td>
                <td className="py-2.5">{d.band8}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <p className="text-center text-xs text-muted">Illustrative AI-generated learning examples — not guaranteed official band-level scripts.</p>
    </div>
  );
}
