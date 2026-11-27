import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BookMarked, Brain, CalendarDays, FileText, Mic, PenLine, Target } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { avg, lastWeeks, speakingBand, weekLabel, DAY } from "@/lib/stats";
import { ensureWeeklyReports, type WeekStats } from "@/lib/reports";
import { focusWeaknesses } from "@/lib/learning";
import { Badge, BandPill, ButtonLink, Card } from "@/components/ui";
import { ActivityBars, BandTrend, CriteriaBars } from "@/components/charts";
import { Goals } from "@/components/Goals";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");
  await ensureWeeklyReports(user.id);
  const weeks = lastWeeks(10);
  const since = weeks[0];

  const [writingAll, speakingAll, wAssess, sAssess, vocab, vocabUsed, weaknessCounts, focus, goals, latestReport, bookmarks, recordings] = await Promise.all([
    prisma.writingAttempt.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: { question: { select: { task: true, topic: true } }, assessment: { select: { overallBand: true } } },
    }),
    prisma.speakingSession.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: { topic: { select: { title: true, part: true } }, assessments: true, _count: { select: { recordings: true } } },
    }),
    prisma.writingAssessment.findMany({ where: { attempt: { userId: user.id } }, orderBy: { createdAt: "asc" } }),
    prisma.speakingAssessment.findMany({ where: { session: { userId: user.id } }, orderBy: { createdAt: "asc" } }),
    prisma.vocabItem.count({ where: { userId: user.id } }),
    prisma.vocabItem.count({ where: { userId: user.id, usages: { some: { verdict: "CORRECT" } } } }),
    prisma.weakness.groupBy({ by: ["status"], where: { userId: user.id }, _count: true }),
    focusWeaknesses(user.id, null, 3),
    prisma.learningGoal.findMany({ where: { userId: user.id }, orderBy: [{ done: "asc" }, { createdAt: "desc" }] }),
    prisma.weeklyReport.findFirst({ where: { userId: user.id }, orderBy: { weekStart: "desc" } }),
    prisma.bookmark.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.speakingRecording.count({ where: { session: { userId: user.id } } }),
  ]);

  const writingSubmitted = writingAll.filter((a) => a.status !== "DRAFT");
  const avgWriting = avg(wAssess.map((a) => a.overallBand));
  const avgSpeaking = avg(sAssess.map(speakingBand));
  const active = weaknessCounts.find((w) => w.status === "ACTIVE")?._count ?? 0;
  const resolved = weaknessCounts.find((w) => w.status === "RESOLVED")?._count ?? 0;

  const inWeek = (d: Date, i: number) => d >= weeks[i] && (i === weeks.length - 1 || d < weeks[i + 1]);
  const trend = weeks.map((w, i) => ({
    label: weekLabel(w),
    writing: avg(wAssess.filter((a) => inWeek(a.createdAt, i)).map((a) => a.overallBand)),
    speaking: avg(sAssess.filter((a) => inWeek(a.createdAt, i)).map(speakingBand)),
  }));
  const activity = weeks.map((w, i) => ({
    label: weekLabel(w),
    writing: writingSubmitted.filter((a) => a.submittedAt && inWeek(a.submittedAt, i)).length,
    speaking: speakingAll.filter((s) => inWeek(s.createdAt, i)).length,
  }));
  const hasHistory = wAssess.length + sAssess.length > 0;

  const bookmarkedW = await prisma.writingQuestion.findMany({ where: { id: { in: bookmarks.filter((b) => b.skill === "WRITING").map((b) => b.questionId) } }, select: { id: true, topic: true, task: true } });
  const bookmarkedS = await prisma.speakingTopic.findMany({ where: { id: { in: bookmarks.filter((b) => b.skill === "SPEAKING").map((b) => b.questionId) } }, select: { id: true, title: true, part: true } });

  const history = [
    ...writingAll.map((a) => ({
      id: a.id,
      when: a.updatedAt,
      icon: "w" as const,
      title: `${a.question.task === "TASK1" ? "Writing Task 1" : "Writing Task 2"} · ${a.question.topic}`,
      href: a.status === "EVALUATED" ? `/writing/attempts/${a.id}` : `/writing/practice/${a.questionId}`,
      band: a.assessment?.overallBand ?? null,
      note: a.status === "DRAFT" ? `draft · ${a.wordCount} words` : a.status === "FAILED" ? "evaluation failed" : `${a.wordCount} words`,
    })),
    ...speakingAll.map((s) => {
      const last = [...s.assessments].sort((a, b) => b.attempt - a.attempt)[0];
      return {
        id: s.id,
        when: s.updatedAt,
        icon: "s" as const,
        title: s.mode === "INTERVIEW" ? "AI examiner interview" : `Speaking Part ${s.topic?.part} · ${s.topic?.title}`,
        href: s.mode === "INTERVIEW" ? `/speaking/interview/${s.id}` : `/speaking/practice/${s.id}`,
        band: last ? speakingBand(last) : null,
        note: `${s._count.recordings} recording${s._count.recordings === 1 ? "" : "s"}`,
      };
    }),
  ]
    .sort((a, b) => b.when.getTime() - a.when.getTime())
    .slice(0, 12);

  const daysToExam = user.examDate ? Math.ceil((user.examDate.getTime() - Date.now()) / DAY) : null;
  const report = latestReport ? (latestReport.data as unknown as WeekStats) : null;

  const tiles = [
    { label: "Writing sessions", value: writingSubmitted.length, icon: PenLine },
    { label: "Speaking sessions", value: speakingAll.length, icon: Mic },
    { label: "Average Writing band", value: avgWriting?.toFixed(1) ?? "—", icon: FileText },
    { label: "Average Speaking band", value: avgSpeaking?.toFixed(1) ?? "—", icon: Mic },
    { label: "Saved expressions", value: `${vocab}`, sub: `${vocabUsed} used correctly`, icon: BookMarked },
    { label: "Weaknesses", value: `${active} active`, sub: `${resolved} resolved`, icon: Brain },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">Welcome back, {user.name.split(" ")[0]}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-3 text-muted">
            {user.targetBand ? (
              <span className="inline-flex items-center gap-1.5"><Target className="h-4 w-4 text-accent" /> Target band {user.targetBand.toFixed(1)}</span>
            ) : (
              <Link href="/settings" className="text-primary hover:underline">Set your target band</Link>
            )}
            {daysToExam != null && daysToExam >= 0 && (
              <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" /> {daysToExam} days to your exam</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <ButtonLink href="/writing"><PenLine className="h-4 w-4" /> Write</ButtonLink>
          <ButtonLink href="/speaking" variant="secondary"><Mic className="h-4 w-4" /> Speak</ButtonLink>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {tiles.map((t) => (
          <Card key={t.label} className="p-4">
            <t.icon className="h-4 w-4 text-muted" />
            <p className="mt-2 text-xl font-semibold tabular-nums">{t.value}</p>
            <p className="text-xs text-muted">{t.label}</p>
            {t.sub && <p className="text-xs text-muted">{t.sub}</p>}
          </Card>
        ))}
      </div>

      {hasHistory ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <h2 className="font-semibold">Band progress (weekly average)</h2>
            <BandTrend data={trend} />
            <p className="text-xs text-muted">Speaking uses the provisional 3-criteria average when pronunciation was not assessed. All scores are AI estimates.</p>
          </Card>
          <Card className="p-5">
            <h2 className="font-semibold">Practice activity</h2>
            <ActivityBars data={activity} height={240} />
          </Card>
          <Card className="p-5">
            <h2 className="font-semibold">Writing criteria (average)</h2>
            <CriteriaBars
              height={180}
              data={[
                { label: "Task resp./ach.", value: avg(wAssess.map((a) => a.taBand)) },
                { label: "Coherence", value: avg(wAssess.map((a) => a.ccBand)) },
                { label: "Vocabulary", value: avg(wAssess.map((a) => a.lrBand)) },
                { label: "Grammar", value: avg(wAssess.map((a) => a.graBand)) },
              ]}
            />
          </Card>
          <Card className="p-5">
            <h2 className="font-semibold">Speaking criteria (average)</h2>
            <CriteriaBars
              height={180}
              data={[
                { label: "Fluency", value: avg(sAssess.map((a) => a.fcBand)) },
                { label: "Vocabulary", value: avg(sAssess.map((a) => a.lrBand)) },
                { label: "Grammar", value: avg(sAssess.map((a) => a.graBand)) },
                { label: "Pronunciation", value: avg(sAssess.map((a) => a.pronBand)) },
              ]}
            />
          </Card>
          <Card className="p-5">
            <h2 className="font-semibold">Focus areas</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {focus.map((f) => (
                <li key={f.key}>
                  <Badge tone={f.severity >= 3 ? "danger" : "warning"}>{f.name}</Badge>
                </li>
              ))}
              {!focus.length && <li className="text-muted">No open weaknesses — keep practising to stay sharp.</li>}
            </ul>
            <Link href="/weaknesses" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              Weakness tracker <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Card>
        </div>
      ) : (
        <Card className="mt-6 p-8 text-center">
          <p className="font-semibold">Your progress charts will appear after your first assessed answer.</p>
          <p className="mt-1 text-sm text-muted">Start with a Writing task or a Speaking part — everything is free.</p>
        </Card>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="font-semibold">Practice history</h2>
          <ul className="mt-3 divide-y divide-border text-sm">
            {history.map((h) => (
              <li key={h.id}>
                <Link href={h.href} className="flex items-center gap-3 py-2.5 hover:text-primary">
                  {h.icon === "w" ? <PenLine className="h-4 w-4 shrink-0 text-muted" /> : <Mic className="h-4 w-4 shrink-0 text-muted" />}
                  <span className="min-w-0 flex-1 truncate">
                    {h.title} <span className="text-xs text-muted">· {h.note} · {h.when.toLocaleDateString("en-GB")}</span>
                  </span>
                  {h.band != null && <BandPill band={h.band} />}
                </Link>
              </li>
            ))}
            {!history.length && <li className="py-2.5 text-muted">Nothing yet.</li>}
          </ul>
          <p className="mt-3 text-xs text-muted">
            {writingAll.length} saved essays and drafts · {recordings} audio recordings with transcripts. Open any item to review your answer and feedback.
          </p>
        </Card>
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="font-semibold">Latest weekly report</h2>
            {report && !report.empty && latestReport ? (
              <div className="mt-2 text-sm">
                <p className="text-muted">Week of {latestReport.weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>
                <p className="mt-2 flex gap-2">
                  <BandPill band={report.writing.avgBand} label="W" />
                  <BandPill band={report.speaking.avgBand} label="S" />
                </p>
                <Link href={`/reports/${latestReport.id}`} className="mt-3 inline-flex items-center gap-1 font-medium text-primary hover:underline">
                  Open report <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted">
                Your first report appears after a week with practice. <Link href="/reports" className="text-primary hover:underline">See this week so far</Link>
              </p>
            )}
          </Card>
          <Card className="p-5">
            <h2 className="font-semibold">Bookmarked questions</h2>
            <ul className="mt-2 space-y-1.5 text-sm">
              {bookmarkedW.map((q) => (
                <li key={q.id}>
                  <Link href={`/writing/practice/${q.id}`} className="hover:text-primary">{q.task === "TASK1" ? "Task 1" : "Task 2"} · {q.topic}</Link>
                </li>
              ))}
              {bookmarkedS.map((t) => (
                <li key={t.id}>
                  <Link href={`/speaking/compare/${t.id}`} className="hover:text-primary">Speaking Part {t.part} · {t.title}</Link>
                </li>
              ))}
              {!bookmarkedW.length && !bookmarkedS.length && <li className="text-muted">No bookmarks yet.</li>}
            </ul>
          </Card>
        </div>
      </div>

      <Card className="mt-6 p-5">
        <h2 className="font-semibold">Personal learning goals</h2>
        <div className="mt-3">
          <Goals compact initial={goals.map((g) => ({ id: g.id, title: g.title, done: g.done, targetDate: g.targetDate?.toISOString() ?? null }))} />
        </div>
      </Card>
      <p className="mt-4 text-center text-xs text-muted">Charts cover the last {weeks.length} weeks (since {since.toLocaleDateString("en-GB")}).</p>
    </div>
  );
}
