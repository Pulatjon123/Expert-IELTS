"use client";
import { CheckCircle2, AlertCircle, Target } from "lucide-react";
import { Badge, BandPill, Card } from "@/components/ui";
import { WEAKNESS_CATALOG } from "@/lib/weakness";
import { PrintButton } from "@/components/PrintButton";
import { useI18n } from "@/lib/i18n/client";
import type { SpeakingAssessmentOutput } from "@/lib/ai/speaking";
import type { SpeakingSessionView } from "@/lib/speaking-view";

export type AssessmentView = SpeakingSessionView["assessments"][number];

export function provisional(a: AssessmentView) {
  return Math.round(((a.fcBand + a.lrBand + a.graBand) / 3) * 2) / 2;
}

export function BandSummary({ a }: { a: AssessmentView }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="text-center sm:w-44">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{a.overallBand != null ? "Estimated overall" : "Provisional (3 of 4)"}</p>
        <p className="font-display text-5xl font-semibold text-primary">{(a.overallBand ?? provisional(a)).toFixed(1)}</p>
        <p className="text-xs text-muted">{t("common.aiEstimate")}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <BandPill band={a.fcBand} label="FC" />
        <BandPill band={a.lrBand} label="LR" />
        <BandPill band={a.graBand} label="GRA" />
        {a.pronunciationAssessed ? <BandPill band={a.pronBand} label="P" /> : <Badge tone="warning">Pronunciation: not assessed</Badge>}
      </div>
    </div>
  );
}

export function SpeakingFeedback({ a }: { a: AssessmentView }) {
  const fb = a.feedback as SpeakingAssessmentOutput;
  const crit = [
    { key: "FC", label: "Fluency & Coherence", band: a.fcBand, d: fb.criteria.FC },
    { key: "LR", label: "Lexical Resource", band: a.lrBand, d: fb.criteria.LR },
    { key: "GRA", label: "Grammatical Range & Accuracy", band: a.graBand, d: fb.criteria.GRA },
    ...(a.pronunciationAssessed ? [{ key: "P", label: "Pronunciation", band: a.pronBand ?? 0, d: fb.criteria.P }] : []),
  ];
  const analysis = [
    ["Fluency", fb.analysis.fluency],
    ["Hesitation", fb.analysis.hesitation],
    ["Repetition", fb.analysis.repetition],
    ["Vocabulary range", fb.analysis.vocabularyRange],
    ["Collocations", fb.analysis.collocationAccuracy],
    ["Grammar", fb.analysis.grammaticalAccuracy],
    ["Pronunciation", fb.analysis.pronunciation],
  ];
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <BandSummary a={a} />
          <PrintButton label="Download report" />
        </div>
        <p className="mt-4 text-sm leading-relaxed">{fb.summary}</p>
        {!a.pronunciationAssessed && (
          <p className="mt-2 text-xs text-muted">
            Pronunciation, intonation and stress can only be judged from audio analysis, which is not configured on this server — so it is not scored, and the overall band shown is the average of the other three criteria.
          </p>
        )}
      </Card>
      <Card className="p-5">
        <h3 className="font-semibold">Analysis</h3>
        <dl className="mt-3 grid gap-3 text-sm md:grid-cols-2">
          {analysis.map(([k, v]) => (
            <div key={k}>
              <dt className="font-medium">{k}</dt>
              <dd className="text-muted">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {crit.map((c) => (
          <Card key={c.key} className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{c.label}</h3>
              <BandPill band={c.band} />
            </div>
            <p className="mt-2 text-sm text-muted">{c.d.explanation}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-semibold text-success"><CheckCircle2 className="h-4 w-4" /> Strengths</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">{c.d.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-sm font-semibold text-warning"><AlertCircle className="h-4 w-4" /> Weaknesses</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">{c.d.weaknesses.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
            </div>
            {c.d.examples.map((e, i) => (
              <div key={i} className="mt-2 rounded-lg bg-surface-2 p-2.5 text-sm">
                <p className="italic">“{e.quote}”</p>
                <p className="text-muted">{e.comment}</p>
              </div>
            ))}
            <p className="mt-3 text-sm font-semibold">How to improve</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">{c.d.recommendations.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h3 className="flex items-center gap-2 font-semibold"><Target className="h-4 w-4 text-accent" /> Reaching {fb.nextBand.target}</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">{fb.nextBand.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold">Added to your learning memory</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {fb.weaknesses.map((w) => (
              <Badge key={w.key} tone={w.severity >= 3 ? "danger" : "warning"}>{WEAKNESS_CATALOG[w.key]?.name ?? w.key}</Badge>
            ))}
            {!fb.weaknesses.length && <p className="text-sm text-muted">No recurring patterns detected.</p>}
          </div>
        </Card>
      </div>
      <p className="text-center text-xs text-muted">Assessed by {a.model}.</p>
    </div>
  );
}
