"use client";
import { useState } from "react";
import { Eye, Sparkles } from "lucide-react";
import { Alert, Button, Card } from "@/components/ui";
import { SaveButton, useSavedVocab } from "@/components/VocabSave";
import { api, ApiError } from "@/lib/fetcher";
import type { SpeakingPrep } from "@/lib/ai/speaking";

export function SpeakingPrepView({ sessionId, topic, initial, aiConfigured }: { sessionId: string; topic: string; initial: SpeakingPrep | null; aiConfigured: boolean }) {
  const [prep, setPrep] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ msg: string; code?: string } | null>(null);
  const [shown, setShown] = useState<Set<number>>(new Set());
  const { saved, save } = useSavedVocab();

  if (!prep) {
    return (
      <Card className="p-6 text-center">
        <Sparkles className="mx-auto h-7 w-7 text-accent" />
        <h3 className="mt-2 font-semibold">Preparation for these questions</h3>
        <p className="mx-auto mt-1 max-w-lg text-sm text-muted">Ideas, topic vocabulary with Uzbek translations, collocations, speaking phrases and Band 8–9 sample answers — to help you build your own answer for the second attempt.</p>
        {error && (
          <div className="mx-auto mt-3 max-w-lg text-left">
            <Alert tone={error.code ? "warning" : "danger"}>{error.msg}</Alert>
          </div>
        )}
        <Button
          className="mt-4"
          loading={loading}
          disabled={!aiConfigured}
          onClick={async () => {
            setLoading(true);
            setError(null);
            try {
              setPrep((await api<{ content: SpeakingPrep }>("/api/speaking/prep", { method: "POST", json: { sessionId } })).content);
            } catch (e) {
              setError({ msg: (e as Error).message, code: e instanceof ApiError ? e.code : undefined });
            } finally {
              setLoading(false);
            }
          }}
        >
          <Sparkles className="h-4 w-4" /> Generate preparation
        </Button>
        {!aiConfigured && <p className="mt-2 text-xs text-warning">The Claude AI service is not configured on this server yet.</p>}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="font-semibold">How to approach this part</h3>
        <p className="mt-2 text-sm">{prep.approach}</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">{prep.originalityTips.map((t, i) => <li key={i}>{t}</li>)}</ul>
      </Card>
      {prep.answers.map((a, i) => (
        <Card key={i} className="p-5">
          <p className="font-semibold">{a.question}</p>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium">Ideas to develop</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">{a.ideas.map((x, k) => <li key={k}>{x}</li>)}</ul>
            </div>
            <div>
              <p className="text-sm font-medium">Structure</p>
              <p className="mt-1 text-sm text-muted">{a.structure}</p>
            </div>
          </div>
          {shown.has(i) ? (
            <div className="mt-3 rounded-xl bg-surface-2 p-4 text-sm leading-relaxed">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Band 8–9 sample (AI-generated, for learning — don’t memorise)</p>
              {a.sampleAnswer}
            </div>
          ) : (
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => setShown((s) => new Set(s).add(i))}>
              <Eye className="h-4 w-4" /> Show sample answer
            </Button>
          )}
        </Card>
      ))}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-semibold">Topic vocabulary</h3>
          <ul className="mt-3 space-y-3 text-sm">
            {prep.vocabulary.map((v) => (
              <li key={v.term}>
                <div className="flex items-start justify-between gap-2">
                  <p><span className="font-semibold">{v.term}</span> <span className="text-accent">— {v.uzbek}</span></p>
                  <SaveButton isSaved={saved.has(v.term.toLowerCase())} onSave={() => save({ expression: v.term, kind: "WORD", uzbek: v.uzbek, definition: v.definition, example: v.example, topic, sourceSkill: "SPEAKING" })} />
                </div>
                <p className="text-muted">{v.definition}</p>
                <p className="italic">“{v.example}”</p>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold">Collocations</h3>
          <ul className="mt-3 space-y-3 text-sm">
            {prep.collocations.map((c) => (
              <li key={c.phrase}>
                <div className="flex items-start justify-between gap-2">
                  <p><span className="font-semibold">{c.phrase}</span> <span className="text-accent">— {c.uzbek}</span></p>
                  <SaveButton isSaved={saved.has(c.phrase.toLowerCase())} onSave={() => save({ expression: c.phrase, kind: "COLLOCATION", uzbek: c.uzbek, definition: c.explanation, example: c.example, topic, sourceSkill: "SPEAKING" })} />
                </div>
                <p className="text-muted">{c.explanation}</p>
                <p className="italic">“{c.example}”</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <Card className="p-5">
        <h3 className="font-semibold">Useful speaking phrases</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(
            [
              ["Starting an answer", prep.phrases.starting],
              ["Buying time", prep.phrases.buyingTime],
              ["Giving opinions", prep.phrases.opinions],
              ["Giving examples", prep.phrases.examples],
              ["Contrasting", prep.phrases.contrasting],
              ["Finishing", prep.phrases.finishing],
            ] as const
          ).map(([label, items]) => (
            <div key={label}>
              <p className="mb-1 text-sm font-medium">{label}</p>
              <ul className="space-y-1 text-sm">
                {items.map((p) => (
                  <li key={p} className="flex items-start justify-between gap-2">
                    <span>{p}</span>
                    <SaveButton isSaved={saved.has(p.toLowerCase())} onSave={() => save({ expression: p, kind: "PHRASE", topic, sourceSkill: "SPEAKING" })} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
