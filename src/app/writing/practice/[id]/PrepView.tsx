"use client";
import { useState } from "react";
import { Eye, Sparkles, ArrowRight } from "lucide-react";
import { SaveButton, useSavedVocab } from "@/components/VocabSave";
import { Alert, Button, Card } from "@/components/ui";
import { api, ApiError } from "@/lib/fetcher";
import { useI18n } from "@/lib/i18n/client";
import { countWords } from "@/lib/ielts";
import type { WritingPrep } from "@/lib/ai/writing";

function Section({ letter, title, children }: { letter: string; title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <h3 className="flex items-center gap-3 font-display text-xl font-semibold">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary-soft text-sm font-bold text-primary">{letter}</span>
        {title}
      </h3>
      <div className="mt-4">{children}</div>
    </Card>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm">
      {items.map((i, k) => (
        <li key={k}>{i}</li>
      ))}
    </ul>
  );
}

export function PrepView({
  questionId,
  topic,
  initial,
  aiConfigured,
  onStartWriting,
}: {
  questionId: string;
  topic: string;
  initial: WritingPrep | null;
  aiConfigured: boolean;
  onStartWriting: () => void;
}) {
  const { t } = useI18n();
  const [prep, setPrep] = useState<WritingPrep | null>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ msg: string; code?: string } | null>(null);
  const [showModel, setShowModel] = useState(false);
  const { saved, save } = useSavedVocab();

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await api<{ content: WritingPrep }>("/api/writing/prep", { method: "POST", json: { questionId } });
      setPrep(r.content);
    } catch (e) {
      setError({ msg: (e as Error).message, code: e instanceof ApiError ? e.code : undefined });
    } finally {
      setLoading(false);
    }
  }

  if (!prep) {
    return (
      <Card className="p-8 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-accent" />
        <h3 className="mt-3 font-display text-xl font-semibold">AI preparation for this question</h3>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
          Question analysis, ideas, topic vocabulary with Uzbek translations, collocations, useful phrases and a Band 8–9 model answer. You can also skip this and write first.
        </p>
        {error && (
          <div className="mx-auto mt-4 max-w-xl text-left">
            <Alert tone={error.code === "AI_NOT_CONFIGURED" || error.code === "AI_LIMIT" ? "warning" : "danger"}>{error.msg}</Alert>
          </div>
        )}
        {!aiConfigured && !error && (
          <div className="mx-auto mt-4 max-w-xl text-left">
            <Alert tone="warning">{t("common.notConfigured")}</Alert>
          </div>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button size="lg" onClick={load} loading={loading} disabled={!aiConfigured}>
            <Sparkles className="h-4 w-4" /> Generate preparation
          </Button>
          <Button size="lg" variant="secondary" onClick={onStartWriting}>
            Write first <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        {loading && <p className="mt-3 text-xs text-muted">Preparing materials… this can take up to a minute the first time. After that it is instant for everyone.</p>}
      </Card>
    );
  }

  const { analysis, ideas, vocabulary, collocations, phrases, modelAnswer } = prep;
  return (
    <div className="space-y-4">
      <Section letter="A" title="Question analysis">
        <p className="text-sm"><span className="font-semibold">Type:</span> {analysis.questionType}</p>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <div>
            <p className="mb-1.5 text-sm font-semibold">Main requirements</p>
            <List items={analysis.mainRequirements} />
          </div>
          <div>
            <p className="mb-1.5 text-sm font-semibold">Key instructions</p>
            <List items={analysis.keyInstructions} />
          </div>
          <div>
            <p className="mb-1.5 text-sm font-semibold">What the examiner expects</p>
            <List items={analysis.examinerExpectations} />
          </div>
          <div>
            <p className="mb-1.5 text-sm font-semibold">Common mistakes</p>
            <List items={analysis.commonMistakes} />
          </div>
        </div>
      </Section>

      <Section letter="B" title="Ideas and paragraph plan">
        <div className="grid gap-4 md:grid-cols-2">
          {ideas.perspectives.map((p) => (
            <div key={p.title} className="rounded-xl bg-surface-2 p-4">
              <p className="font-semibold">{p.title}</p>
              <ul className="mt-2 space-y-3 text-sm">
                {p.points.map((pt, i) => (
                  <li key={i}>
                    <p className="font-medium">{pt.point}</p>
                    <p className="text-muted">{pt.explanation}</p>
                    <p className="mt-0.5 italic text-muted">e.g. {pt.example}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <ol className="mt-5 space-y-2 text-sm">
          {ideas.paragraphPlan.map((p, i) => (
            <li key={i} className="flex gap-3">
              <span className="w-28 shrink-0 font-semibold">{p.paragraph}</span>
              <span>
                <span className="text-muted">{p.purpose} — </span>
                {p.content}
              </span>
            </li>
          ))}
        </ol>
      </Section>

      <Section letter="C" title="Topic vocabulary">
        <div className="grid gap-3 md:grid-cols-2">
          {vocabulary.map((v) => (
            <div key={v.term} className="rounded-xl border border-border p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <p>
                  <span className="font-semibold">{v.term}</span> <span className="text-accent">— {v.uzbek}</span>
                </p>
                <SaveButton
                  isSaved={saved.has(v.term.toLowerCase())}
                  onSave={() => save({ expression: v.term, kind: "WORD", uzbek: v.uzbek, definition: v.definition, example: v.example, topic, sourceSkill: "WRITING" })}
                />
              </div>
              <p className="mt-1 text-muted">{v.definition}</p>
              <p className="mt-1 italic">“{v.example}”</p>
            </div>
          ))}
        </div>
      </Section>

      <Section letter="D" title="Collocations">
        <div className="grid gap-3 md:grid-cols-2">
          {collocations.map((c) => (
            <div key={c.phrase} className="rounded-xl border border-border p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <p>
                  <span className="font-semibold">{c.phrase}</span> <span className="text-accent">— {c.uzbek}</span>
                </p>
                <SaveButton
                  isSaved={saved.has(c.phrase.toLowerCase())}
                  onSave={() => save({ expression: c.phrase, kind: "COLLOCATION", uzbek: c.uzbek, definition: c.explanation, example: c.example, topic, sourceSkill: "WRITING" })}
                />
              </div>
              <p className="mt-1 text-muted">{c.explanation}</p>
              <p className="mt-1 italic">“{c.example}”</p>
            </div>
          ))}
        </div>
      </Section>

      <Section letter="E" title="Useful academic phrases">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(
            [
              ["Introduction", phrases.introduction],
              ["Developing arguments", phrases.development],
              ["Comparison", phrases.comparison],
              ["Cause and effect", phrases.causeEffect],
              ["Conclusion", phrases.conclusion],
            ] as const
          ).map(([label, items]) => (
            <div key={label}>
              <p className="mb-1.5 text-sm font-semibold">{label}</p>
              <ul className="space-y-1 text-sm">
                {items.map((p) => (
                  <li key={p} className="flex items-start justify-between gap-2">
                    <span>{p}</span>
                    <SaveButton isSaved={saved.has(p.toLowerCase())} onSave={() => save({ expression: p, kind: "PHRASE", topic, sourceSkill: "WRITING" })} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section letter="F" title="Band 8–9 model answer">
        {showModel ? (
          <>
            <div className="whitespace-pre-line rounded-xl bg-surface-2 p-5 font-serif text-[17px] leading-8">{modelAnswer.text}</div>
            <p className="mt-2 text-xs text-muted">{countWords(modelAnswer.text)} words · AI-generated illustrative answer, not an official IELTS script.</p>
            <p className="mb-1.5 mt-4 text-sm font-semibold">Why it works</p>
            <List items={modelAnswer.notes} />
          </>
        ) : (
          <div className="text-center">
            <p className="text-sm text-muted">Try planning your own answer first — reading a model too early makes it tempting to copy instead of learn.</p>
            <Button variant="secondary" className="mt-3" onClick={() => setShowModel(true)}>
              <Eye className="h-4 w-4" /> Show model answer
            </Button>
          </div>
        )}
      </Section>

      <div className="flex justify-center pt-2">
        <Button size="lg" onClick={onStartWriting}>
          {t("writing.write")} <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
