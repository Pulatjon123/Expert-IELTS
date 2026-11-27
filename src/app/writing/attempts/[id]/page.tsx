import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, AlertCircle, ArrowUpRight, Target } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { BandPill, Badge, Card } from "@/components/ui";
import { Highlighted, type Mark } from "@/components/Highlighted";
import { CategoryBadge } from "@/components/QuestionMeta";
import { WEAKNESS_CATALOG } from "@/lib/weakness";
import type { WritingAssessmentOutput } from "@/lib/ai/writing";
import { FeedbackActions, EssayCompare } from "./FeedbackClient";

export const dynamic = "force-dynamic";

type Feedback = Omit<WritingAssessmentOutput, "repetition"> & { repetition: { word: string; count: number; alternatives: string[] }[] };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/writing/attempts/${id}`);
  const { t, locale } = await getT();
  const attempt = await prisma.writingAttempt.findFirst({
    where: { id, ...(user.role === "ADMIN" ? {} : { userId: user.id }) },
    include: { question: true, assessment: true },
  });
  if (!attempt) notFound();
  if (!attempt.assessment) redirect(`/writing/practice/${attempt.questionId}`);

  const a = attempt.assessment;
  const fb = a.feedback as unknown as Feedback;
  const taLabel = attempt.question.task === "TASK1" ? "Task Achievement" : "Task Response";
  const criteria = [
    { key: "TA", label: taLabel, band: a.taBand, data: fb.criteria.TA },
    { key: "CC", label: "Coherence & Cohesion", band: a.ccBand, data: fb.criteria.CC },
    { key: "LR", label: "Lexical Resource", band: a.lrBand, data: fb.criteria.LR },
    { key: "GRA", label: "Grammatical Range & Accuracy", band: a.graBand, data: fb.criteria.GRA },
  ];
  const marks: Mark[] = [
    ...fb.grammarCorrections.map((g) => ({ text: g.original, kind: "grammar" as const, note: `→ ${g.corrected}. ${g.explanation}` })),
    ...fb.collocations.map((c) => ({ text: c.original, kind: "unnatural" as const, note: `More natural: ${c.natural}` })),
    ...fb.vocabulary.improvements.map((v) => ({ text: v.original, kind: "vocab" as const, note: `Better: ${v.suggestion} — ${v.reason}` })),
  ];
  const vocabUsage = await prisma.vocabUsage.findMany({ where: { sourceId: attempt.id }, include: { vocab: { select: { expression: true } } } });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 print:max-w-none print:px-0">
      <div className="print:hidden">
        <Link href="/writing" className="text-sm text-muted hover:text-text">← {t("writing.title")}</Link>
      </div>

      <Card className="mt-3 p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="text-center md:w-48">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Estimated overall band</p>
            <p className="mt-1 font-display text-6xl font-semibold text-primary">{a.overallBand.toFixed(1)}</p>
            <p className="mt-1 text-xs text-muted">{t("common.aiEstimate")}</p>
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{attempt.question.task === "TASK1" ? t("writing.task1") : t("writing.task2")}</span>
              <CategoryBadge category={attempt.question.category} locale={locale} />
              <span className="text-xs text-muted">
                {attempt.wordCount} words · {Math.round(attempt.timeSpentSec / 60)} min · {attempt.submittedAt?.toLocaleDateString("en-GB")}
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed">{fb.summary}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {criteria.map((c) => (
                <BandPill key={c.key} band={c.band} label={c.key} />
              ))}
            </div>
          </div>
          <FeedbackActions questionId={attempt.questionId} />
        </div>
        <details className="mt-5 text-sm">
          <summary className="cursor-pointer text-muted">Question</summary>
          <p className="mt-2 whitespace-pre-line">{attempt.question.prompt}</p>
        </details>
      </Card>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {criteria.map((c) => (
          <Card key={c.key} className="p-5 print:break-inside-avoid">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">{c.label}</h2>
              <BandPill band={c.band} />
            </div>
            <p className="mt-2 text-sm text-muted">{c.data.explanation}</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-semibold text-success"><CheckCircle2 className="h-4 w-4" /> Strengths</p>
                <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm">{c.data.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-sm font-semibold text-warning"><AlertCircle className="h-4 w-4" /> Weaknesses</p>
                <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm">{c.data.weaknesses.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
            </div>
            {c.data.examples.length > 0 && (
              <div className="mt-4 space-y-2">
                {c.data.examples.map((e, i) => (
                  <div key={i} className="rounded-lg bg-surface-2 p-3 text-sm">
                    <p className="italic">“{e.quote}”</p>
                    <p className="mt-1 text-muted">{e.comment}</p>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-4 text-sm font-semibold">How to improve</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm">{c.data.recommendations.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </Card>
        ))}
      </div>

      <Card className="mt-6 p-5 sm:p-6">
        <h2 className="font-semibold">Your essay, annotated</h2>
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
          <span><mark className="mark-grammar text-inherit">grammar</mark></span>
          <span><mark className="mark-vocab text-inherit">word choice</mark></span>
          <span><mark className="mark-unnatural text-inherit">collocation</mark></span>
          <span>Hover a highlight for the correction. Your original text is shown exactly as submitted.</span>
        </div>
        <Highlighted source={attempt.content} marks={marks} className="mt-4 whitespace-pre-line font-serif text-[17px] leading-8" />
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-semibold">Grammar corrections ({fb.grammarCorrections.length})</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {fb.grammarCorrections.map((g, i) => (
              <li key={i}>
                <p><span className="text-danger line-through decoration-1">{g.original}</span> → <span className="font-medium text-success">{g.corrected}</span></p>
                <p className="text-muted">{g.explanation}</p>
              </li>
            ))}
            {!fb.grammarCorrections.length && <li className="text-muted">No grammar errors were identified.</li>}
          </ul>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold">Vocabulary</h2>
          <p className="mt-2 text-sm text-muted">{fb.vocabulary.summary}</p>
          {fb.vocabulary.effective.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {fb.vocabulary.effective.map((v) => <Badge key={v} tone="success">{v}</Badge>)}
            </div>
          )}
          <ul className="mt-3 space-y-2 text-sm">
            {fb.vocabulary.improvements.map((v, i) => (
              <li key={i}><span className="font-medium">{v.original}</span> → <span className="text-primary">{v.suggestion}</span> <span className="text-muted">— {v.reason}</span></li>
            ))}
          </ul>
          {fb.collocations.length > 0 && (
            <>
              <h3 className="mt-5 text-sm font-semibold">Collocations</h3>
              <ul className="mt-2 space-y-2 text-sm">
                {fb.collocations.map((c, i) => (
                  <li key={i}><span className="font-medium">{c.original}</span> → <span className="text-primary">{c.natural}</span> <span className="text-muted">— {c.explanation}</span></li>
                ))}
              </ul>
            </>
          )}
          {fb.repetition.length > 0 && (
            <>
              <h3 className="mt-5 text-sm font-semibold">Repetition</h3>
              <ul className="mt-2 space-y-1.5 text-sm">
                {fb.repetition.map((r) => (
                  <li key={r.word}><span className="font-medium">“{r.word}”</span> used {r.count}× — try: {r.alternatives.join(", ")}</li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>

      <EssayCompare original={attempt.content} improved={fb.improvedEssay} />

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-semibold"><Target className="h-4 w-4 text-accent" /> Reaching {fb.nextBand.target}</h2>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm">{fb.nextBand.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold">Added to your learning memory</h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {fb.weaknesses.map((w) => (
              <Badge key={w.key} tone={w.severity >= 3 ? "danger" : "warning"}>{WEAKNESS_CATALOG[w.key]?.name ?? w.key}</Badge>
            ))}
            {!fb.weaknesses.length && <p className="text-sm text-muted">No recurring problem patterns detected in this answer.</p>}
          </div>
          {vocabUsage.length > 0 && (
            <>
              <p className="mt-4 text-sm font-semibold">Saved vocabulary you used</p>
              <ul className="mt-2 space-y-1.5 text-sm">
                {vocabUsage.map((u) => (
                  <li key={u.id}>
                    <Badge tone={u.verdict === "CORRECT" ? "success" : u.verdict === "UNNATURAL" ? "warning" : "danger"}>{u.verdict.toLowerCase()}</Badge>{" "}
                    <span className="font-medium">{u.vocab.expression}</span> <span className="text-muted">— {u.comment}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <Link href="/weaknesses" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline print:hidden">
            Open weakness tracker <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </Card>
      </div>
      <p className="mt-6 text-center text-xs text-muted">Assessed by {a.model}. {t("common.aiEstimate")}.</p>
    </div>
  );
}
