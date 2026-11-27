"use client";
import Link from "next/link";
import { useCallback, useState } from "react";
import { ArrowRight, BarChart3, Check, Layers, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Alert, Badge, Button, Card, cn } from "@/components/ui";
import { SourceBadge } from "@/components/QuestionMeta";
import { api, ApiError } from "@/lib/fetcher";
import { uploadRecording } from "@/lib/upload-recording";
import { useI18n } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n/dict";
import type { SpeakingSessionView, RecordingView } from "@/lib/speaking-view";
import type { SpeakingPrep, SpeakingAssessmentOutput } from "@/lib/ai/speaking";
import { AnswerRecorder } from "./AnswerRecorder";
import { TranscriptView } from "./TranscriptView";
import { SpeakingFeedback, BandSummary, provisional, type AssessmentView } from "./SpeakingFeedback";
import { SpeakingPrepView } from "./SpeakingPrepView";
import { BookmarkToggle } from "@/components/BookmarkToggle";

type Step = 1 | 2 | 3 | 4;
interface Services {
  stt: boolean;
  ai: boolean;
  pronunciation: boolean;
}

function latest(recs: RecordingView[], attempt: number, q: number) {
  return recs.filter((r) => r.attempt === attempt && r.questionIndex === q).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

export function SpeakingWorkspace({ initial, locale, initialPrep, services, focus, bookmarked = false }: { initial: SpeakingSessionView; locale: Locale; initialPrep: SpeakingPrep | null; services: Services; focus?: React.ReactNode; bookmarked?: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [view, setView] = useState(initial);
  const has = (attempt: number) => view.recordings.some((r) => r.attempt === attempt);
  const a1 = view.assessments.find((a) => a.attempt === 1);
  const a2 = view.assessments.find((a) => a.attempt === 2);
  const [step, setStep] = useState<Step>(has(2) ? 4 : a1 ? 2 : 1);

  const refresh = useCallback(async () => setView(await api<SpeakingSessionView>(`/api/speaking/sessions/${view.id}`)), [view.id]);

  const steps: { n: Step; label: string; enabled: boolean; done: boolean }[] = [
    { n: 1, label: t("speaking.step1"), enabled: true, done: has(1) },
    { n: 2, label: t("speaking.step2"), enabled: has(1), done: !!a1 },
    { n: 3, label: t("speaking.step3"), enabled: has(1), done: has(2) },
    { n: 4, label: t("speaking.step4"), enabled: has(2), done: !!a2 },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <Link href="/speaking" className="text-sm text-muted hover:text-text">← {t("speaking.title")}</Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            if (!confirm("Delete this session and all of its recordings?")) return;
            await api(`/api/speaking/sessions/${view.id}`, { method: "DELETE" });
            router.push("/speaking");
            router.refresh();
          }}
        >
          <Trash2 className="h-4 w-4" /> Delete session
        </Button>
      </div>

      <Card className="mt-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">Part {view.topic.part}</span>
          <SourceBadge source={view.topic.source} note={view.topic.sourceNote} reportedAt={view.topic.reportedAt} locale={locale} />
          <span className="text-xs text-muted">{view.topic.topic}</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <h1 className="font-display text-2xl font-semibold">{view.topic.title}</h1>
          <Link href={`/speaking/compare/${view.topic.id}?from=${view.id}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
            <Layers className="h-4 w-4" /> Band 6 / 7 / 8 answers
          </Link>
          <BookmarkToggle topicId={view.topic.id} initial={bookmarked} />
        </div>
      </Card>

      {focus && <div className="mt-4">{focus}</div>}

      <ol className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {steps.map((s) => (
          <li key={s.n}>
            <button
              disabled={!s.enabled}
              onClick={() => setStep(s.n)}
              className={cn(
                "flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition",
                step === s.n ? "border-primary bg-primary-soft font-semibold text-primary" : "border-border bg-surface hover:bg-surface-2",
                !s.enabled && "cursor-not-allowed opacity-50",
              )}
            >
              <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold", s.done ? "bg-success text-white" : "bg-surface-2 text-muted")}>
                {s.done ? <Check className="h-3.5 w-3.5" /> : s.n}
              </span>
              {s.label}
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-5">
        {step === 1 && (
          <AttemptPanel
            attempt={1}
            view={view}
            services={services}
            refresh={refresh}
            intro="Answer on your own first — no preparation materials yet. Record each question, listen back, and save the take you want assessed."
            onAnalysed={() => setStep(2)}
            assessed={!!a1}
          />
        )}
        {step === 2 && (
          <div className="space-y-6">
            {a1 ? (
              <>
                <SpeakingFeedback a={a1} />
                <ImprovedAnswers a={a1} questions={view.questions} />
              </>
            ) : (
              <Alert tone="neutral" title="First attempt not analysed yet">
                Go back to step 1 and click “{t("speaking.analyse")}” to get feedback on your first answers. You can still use the preparation below.
              </Alert>
            )}
            <div>
              <h2 className="mb-3 font-display text-2xl font-semibold">Preparation</h2>
              <SpeakingPrepView sessionId={view.id} topic={view.topic.topic} initial={initialPrep} aiConfigured={services.ai} />
            </div>
            <div className="flex justify-center">
              <Button size="lg" onClick={() => setStep(3)}>
                {t("speaking.step3")} <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        {step === 3 && (
          <AttemptPanel
            attempt={2}
            view={view}
            services={services}
            refresh={refresh}
            intro="Answer the same questions again, using what you learned — in your own words, not the sample answers."
            onAnalysed={() => setStep(4)}
            assessed={!!a2}
          />
        )}
        {step === 4 && <CompareView view={view} a1={a1} a2={a2} sttConfigured={services.stt} refresh={refresh} />}
      </div>
    </div>
  );
}

function AttemptPanel({
  attempt,
  view,
  services,
  refresh,
  intro,
  onAnalysed,
  assessed,
}: {
  attempt: 1 | 2;
  view: SpeakingSessionView;
  services: Services;
  refresh: () => Promise<void>;
  intro: string;
  onAnalysed: () => void;
  assessed: boolean;
}) {
  const { t } = useI18n();
  const [notice, setNotice] = useState<string | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [error, setError] = useState<{ msg: string; code?: string } | null>(null);
  const isPart2 = view.topic.part === 2;
  const recorded = view.questions.filter((_, i) => latest(view.recordings, attempt, i)).length;

  async function upload(q: number, wav: Blob) {
    const { transcriptionError } = await uploadRecording(view.id, wav, attempt, q);
    setNotice(transcriptionError ? `Answer saved. ${transcriptionError}` : null);
    await refresh();
  }

  async function analyse() {
    setAnalysing(true);
    setError(null);
    try {
      await api(`/api/speaking/sessions/${view.id}/assess`, { method: "POST", json: { attempt } });
      await refresh();
      onAnalysed();
    } catch (e) {
      setError({ msg: (e as Error).message, code: e instanceof ApiError ? e.code : undefined });
    } finally {
      setAnalysing(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{intro}</p>
      {view.questions.map((q, i) => {
        const rec = latest(view.recordings, attempt, i);
        return (
          <Card key={i} className="p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary-soft text-sm font-bold text-primary">{i + 1}</span>
              <div className="min-w-0 flex-1">
                {isPart2 ? (
                  <div className="rounded-xl border border-border bg-surface-2 p-4">
                    <p className="font-semibold">{view.topic.cueCard}</p>
                    <p className="mt-2 text-sm text-muted">You should say:</p>
                    <ul className="mt-1 list-disc pl-5 text-sm">{view.topic.bulletPoints.map((b) => <li key={b}>{b}</li>)}</ul>
                  </div>
                ) : (
                  <p className="font-medium">{q}</p>
                )}
                <div className="mt-4 space-y-3">
                  {rec && <TranscriptView rec={rec} onRetried={refresh} sttConfigured={services.stt} />}
                  <AnswerRecorder isPart2={isPart2} hasSaved={!!rec} onSave={(wav) => upload(i, wav)} />
                </div>
              </div>
            </div>
          </Card>
        );
      })}
      {notice && <Alert tone="warning">{notice}</Alert>}
      <Card className="flex flex-col items-center gap-3 p-5 text-center">
        <p className="text-sm text-muted">
          {recorded} of {view.questions.length} answered.{" "}
          {assessed ? "Already analysed — analysing again replaces the previous feedback for this attempt." : ""}
        </p>
        <Button size="lg" onClick={analyse} loading={analysing} disabled={!recorded || !services.ai || !services.stt}>
          <BarChart3 className="h-4 w-4" /> {t("speaking.analyse")}
        </Button>
        {(!services.ai || !services.stt) && (
          <p className="text-xs text-warning">
            Analysis needs {[!services.stt && "speech-to-text", !services.ai && "the Claude AI service"].filter(Boolean).join(" and ")}, which {!services.ai && !services.stt ? "are" : "is"} not configured on this server yet. Your recordings are saved.
          </p>
        )}
        {analysing && <p className="text-xs text-muted">The examiner is listening to your answers… this can take up to a minute.</p>}
        {error && <Alert tone={error.code ? "warning" : "danger"}>{error.msg}</Alert>}
      </Card>
    </div>
  );
}

function ImprovedAnswers({ a, questions }: { a: AssessmentView; questions: string[] }) {
  const fb = a.feedback as SpeakingAssessmentOutput;
  if (!fb.improvedAnswers.length) return null;
  return (
    <Card className="p-5">
      <h3 className="font-semibold">Your answers, one band higher</h3>
      <p className="mt-1 text-xs text-muted">Built from your own ideas, so you can hear what the next level sounds like.</p>
      <ul className="mt-3 space-y-3 text-sm">
        {fb.improvedAnswers
          .filter((x) => x.questionIndex >= 0)
          .map((x) => (
            <li key={x.questionIndex}>
              <p className="font-medium">{questions[x.questionIndex]?.split("\n")[0]}</p>
              <p className="mt-1 rounded-lg bg-surface-2 p-3 leading-relaxed">{x.answer}</p>
            </li>
          ))}
      </ul>
    </Card>
  );
}

function delta(a?: number | null, b?: number | null) {
  if (a == null || b == null) return null;
  const d = b - a;
  return <Badge tone={d > 0 ? "success" : d < 0 ? "danger" : "neutral"}>{d > 0 ? `+${d}` : d}</Badge>;
}

function CompareView({ view, a1, a2, sttConfigured, refresh }: { view: SpeakingSessionView; a1?: AssessmentView; a2?: AssessmentView; sttConfigured: boolean; refresh: () => Promise<void> }) {
  const rows: [string, number | null | undefined, number | null | undefined][] = [
    ["Overall", a1 && (a1.overallBand ?? provisional(a1)), a2 && (a2.overallBand ?? provisional(a2))],
    ["Fluency & Coherence", a1?.fcBand, a2?.fcBand],
    ["Lexical Resource", a1?.lrBand, a2?.lrBand],
    ["Grammar", a1?.graBand, a2?.graBand],
    ["Pronunciation", a1?.pronBand, a2?.pronBand],
  ];
  return (
    <div className="space-y-5">
      {a1 && a2 ? (
        <Card className="p-5">
          <h2 className="font-semibold">First vs second attempt</h2>
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="py-1.5">Criterion</th>
                <th>1st</th>
                <th>2nd</th>
                <th>Change</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {rows.map(([label, x, y]) => (
                <tr key={label} className="border-t border-border">
                  <td className="py-2">{label}</td>
                  <td>{x == null ? "—" : x.toFixed(1)}</td>
                  <td>{y == null ? "—" : y.toFixed(1)}</td>
                  <td>{delta(x, y)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted">AI estimates. Pronunciation shows “—” when no audio pronunciation service is configured.</p>
        </Card>
      ) : (
        <Alert tone="neutral" title="Analyse both attempts to compare scores">Recordings and transcripts are compared below; band changes appear once both attempts have been analysed.</Alert>
      )}
      {a2 && (
        <details className="rounded-2xl border border-border bg-surface p-5">
          <summary className="cursor-pointer font-semibold">Full feedback on the second attempt</summary>
          <div className="mt-4 space-y-4">
            <BandSummary a={a2} />
            <SpeakingFeedback a={a2} />
          </div>
        </details>
      )}
      {view.questions.map((q, i) => {
        const r1 = latest(view.recordings, 1, i);
        const r2 = latest(view.recordings, 2, i);
        if (!r1 && !r2) return null;
        return (
          <Card key={i} className="p-5">
            <p className="font-medium">
              {i + 1}. {q.split("\n")[0]}
            </p>
            <div className="mt-4 grid gap-5 lg:grid-cols-2">
              {[r1, r2].map((r, k) => (
                <div key={k}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{k === 0 ? "First attempt" : "Second attempt"}</p>
                  {r ? <TranscriptView rec={r} sttConfigured={sttConfigured} onRetried={refresh} /> : <p className="text-sm text-muted">Not recorded.</p>}
                </div>
              ))}
            </div>
            {r1?.metrics && r2?.metrics && (
              <div className="mt-4 rounded-lg bg-surface-2 p-3 text-sm">
                <p className="mb-1 font-medium">Measured change</p>
                <div className="flex flex-wrap gap-x-5 gap-y-1">
                  <span>Words: {r1.metrics.wordCount} → {r2.metrics.wordCount}</span>
                  <span>Speed: {r1.metrics.wpm} → {r2.metrics.wpm} wpm</span>
                  <span>Fillers: {r1.metrics.fillers.count} → {r2.metrics.fillers.count}</span>
                  {r1.metrics.pauses && r2.metrics.pauses && <span>Long pauses: {r1.metrics.pauses.count} → {r2.metrics.pauses.count}</span>}
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
