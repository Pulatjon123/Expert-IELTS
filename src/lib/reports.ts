import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { avg, DAY, speakingBand, weekStart } from "./stats";
import { focusWeaknesses } from "./learning";
import type { AudioMetrics } from "./audio/metrics";
import type { PronunciationResult } from "./audio/pronunciation";

export interface WeekStats {
  weekStart: string;
  weekEnd: string;
  empty: boolean;
  writing: { count: number; avgBand: number | null; criteria: { TA: number | null; CC: number | null; LR: number | null; GRA: number | null }; words: number };
  speaking: {
    count: number;
    avgBand: number | null;
    criteria: { FC: number | null; LR: number | null; GRA: number | null; P: number | null };
    avgWpm: number | null;
    fillersPerMin: number | null;
    longPauses: number | null;
    pronunciation: number | null;
    minutes: number;
  };
  mistakes: { writing: { name: string; count: number }[]; speaking: { name: string; count: number }[] };
  weaknesses: { corrected: string[]; remaining: { name: string; count: number }[] };
  vocab: { saved: number; usedCorrectly: number; usedIncorrectly: number; collocationsCorrect: number };
  previous: { writingAvg: number | null; speakingAvg: number | null; criteria: Record<string, number | null> };
  mostImproved: { label: string; delta: number }[];
  recommendations: string[];
  goalsNextWeek: string[];
  ai?: { summary: string; recommendations: string[]; goals: string[]; model: string };
}

const LABELS: Record<string, string> = {
  TA: "Task achievement/response",
  CC: "Coherence & cohesion",
  LR: "Writing vocabulary",
  GRA: "Writing grammar",
  FC: "Speaking fluency",
  SLR: "Speaking vocabulary",
  SGRA: "Speaking grammar",
  P: "Pronunciation",
};

async function rawWeek(userId: string, from: Date, to: Date) {
  const [wa, sa, recs, occ, vocabSaved, usages] = await Promise.all([
    prisma.writingAssessment.findMany({ where: { attempt: { userId }, createdAt: { gte: from, lt: to } }, include: { attempt: { select: { wordCount: true } } } }),
    prisma.speakingAssessment.findMany({ where: { session: { userId }, createdAt: { gte: from, lt: to } } }),
    prisma.speakingRecording.findMany({ where: { session: { userId }, createdAt: { gte: from, lt: to } }, select: { audioMetrics: true, pronunciation: true, durationSec: true } }),
    prisma.weaknessOccurrence.findMany({ where: { weakness: { userId }, createdAt: { gte: from, lt: to } }, include: { weakness: { select: { key: true, name: true } } } }),
    prisma.vocabItem.count({ where: { userId, createdAt: { gte: from, lt: to } } }),
    prisma.vocabUsage.findMany({ where: { vocab: { userId }, createdAt: { gte: from, lt: to } }, include: { vocab: { select: { kind: true } } } }),
  ]);
  return { wa, sa, recs, occ, vocabSaved, usages };
}

function top(occ: { skill: string; weakness: { name: string } }[], skill: string) {
  const m = new Map<string, number>();
  for (const o of occ) if (o.skill === skill) m.set(o.weakness.name, (m.get(o.weakness.name) ?? 0) + 1);
  return [...m.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);
}

/** Measured weekly statistics. Everything here is computed from stored results — no AI involved. */
export async function computeWeekStats(userId: string, start: Date): Promise<WeekStats> {
  const end = new Date(start.getTime() + 7 * DAY);
  const prevStart = new Date(start.getTime() - 7 * DAY);
  const [cur, prev, earlier] = await Promise.all([
    rawWeek(userId, start, end),
    rawWeek(userId, prevStart, start),
    prisma.weaknessOccurrence.findMany({
      where: { weakness: { userId }, createdAt: { gte: new Date(start.getTime() - 28 * DAY), lt: start } },
      include: { weakness: { select: { key: true, name: true, skills: true } } },
    }),
  ]);

  const wCrit = { TA: avg(cur.wa.map((a) => a.taBand)), CC: avg(cur.wa.map((a) => a.ccBand)), LR: avg(cur.wa.map((a) => a.lrBand)), GRA: avg(cur.wa.map((a) => a.graBand)) };
  const sCrit = { FC: avg(cur.sa.map((a) => a.fcBand)), LR: avg(cur.sa.map((a) => a.lrBand)), GRA: avg(cur.sa.map((a) => a.graBand)), P: avg(cur.sa.map((a) => a.pronBand)) };
  const metrics = cur.recs.map((r) => r.audioMetrics as unknown as AudioMetrics | null).filter((m): m is AudioMetrics => !!m);
  const pron = cur.recs.map((r) => (r.pronunciation as unknown as PronunciationResult | null)?.overall);
  const minutes = cur.recs.reduce((a, r) => a + (r.durationSec ?? 0), 0) / 60;

  const pwCrit = { TA: avg(prev.wa.map((a) => a.taBand)), CC: avg(prev.wa.map((a) => a.ccBand)), LR: avg(prev.wa.map((a) => a.lrBand)), GRA: avg(prev.wa.map((a) => a.graBand)) };
  const psCrit = { FC: avg(prev.sa.map((a) => a.fcBand)), SLR: avg(prev.sa.map((a) => a.lrBand)), SGRA: avg(prev.sa.map((a) => a.graBand)), P: avg(prev.sa.map((a) => a.pronBand)) };
  const nowCrit: Record<string, number | null> = { ...wCrit, FC: sCrit.FC, SLR: sCrit.LR, SGRA: sCrit.GRA, P: sCrit.P };
  const prevCrit: Record<string, number | null> = { ...pwCrit, ...psCrit };
  const mostImproved = Object.keys(nowCrit)
    .filter((k) => nowCrit[k] != null && prevCrit[k] != null)
    .map((k) => ({ label: LABELS[k], delta: Math.round((nowCrit[k]! - prevCrit[k]!) * 10) / 10 }))
    .filter((x) => x.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 3);

  // A weakness counts as "corrected" this week if it appeared in the previous 4 weeks, the student was assessed
  // in that skill this week, and it did not appear again.
  const seenNow = new Set(cur.occ.map((o) => o.weakness.key));
  const assessedSkills = new Set([...(cur.wa.length ? ["WRITING"] : []), ...(cur.sa.length ? ["SPEAKING"] : [])]);
  const corrected = [...new Map(earlier.filter((o) => !seenNow.has(o.weakness.key) && assessedSkills.has(o.skill)).map((o) => [o.weakness.key, o.weakness.name])).values()];
  const remainingMap = new Map<string, number>();
  for (const o of cur.occ) remainingMap.set(o.weakness.name, (remainingMap.get(o.weakness.name) ?? 0) + 1);

  const focus = await focusWeaknesses(userId, null, 3);
  const writingAvg = avg(cur.wa.map((a) => a.overallBand));
  const speakingAvg = avg(cur.sa.map(speakingBand));
  const recommendations: string[] = [];
  if (!cur.wa.length) recommendations.push("Complete at least two Writing tasks next week (one Task 1 and one Task 2) so your progress can be measured.");
  if (!cur.sa.length) recommendations.push("Record at least two Speaking practice sessions or one full AI examiner interview next week.");
  for (const f of focus) recommendations.push(`${f.name}: ${f.practice}`);
  if (metrics.length && avg(metrics.map((m) => m.fillers.perMinute))! > 6) recommendations.push("Your filler-word rate is high — practise short pauses instead of “um/uh” while you plan the next idea.");
  const lowest = Object.entries(nowCrit).filter(([, v]) => v != null).sort((a, b) => a[1]! - b[1]!)[0];
  const goalsNextWeek = [
    `${Math.max(2, cur.wa.length + 1)} Writing submissions and ${Math.max(2, cur.sa.length + 1)} Speaking sessions`,
    ...(lowest ? [`Raise ${LABELS[lowest[0]]} above ${lowest[1]!.toFixed(1)}`] : []),
    ...(focus[0] ? [`No “${focus[0].name.toLowerCase()}” mistakes in your next two assessed answers`] : []),
  ];

  const empty = !cur.wa.length && !cur.sa.length && !cur.recs.length && !cur.vocabSaved;
  return {
    weekStart: start.toISOString(),
    weekEnd: end.toISOString(),
    empty,
    writing: { count: cur.wa.length, avgBand: writingAvg, criteria: wCrit, words: cur.wa.reduce((a, x) => a + x.attempt.wordCount, 0) },
    speaking: {
      count: cur.sa.length,
      avgBand: speakingAvg,
      criteria: sCrit,
      avgWpm: avg(metrics.map((m) => m.wpm)),
      fillersPerMin: avg(metrics.map((m) => m.fillers.perMinute)),
      longPauses: avg(metrics.map((m) => m.pauses?.count)),
      pronunciation: avg(pron),
      minutes: Math.round(minutes * 10) / 10,
    },
    mistakes: { writing: top(cur.occ, "WRITING"), speaking: top(cur.occ, "SPEAKING") },
    weaknesses: { corrected, remaining: [...remainingMap.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count) },
    vocab: {
      saved: cur.vocabSaved,
      usedCorrectly: cur.usages.filter((u) => u.verdict === "CORRECT").length,
      usedIncorrectly: cur.usages.filter((u) => u.verdict !== "CORRECT").length,
      collocationsCorrect: cur.usages.filter((u) => u.verdict === "CORRECT" && u.vocab.kind === "COLLOCATION").length,
    },
    previous: { writingAvg: avg(prev.wa.map((a) => a.overallBand)), speakingAvg: avg(prev.sa.map(speakingBand)), criteria: prevCrit },
    mostImproved,
    recommendations: recommendations.slice(0, 6),
    goalsNextWeek,
  };
}

/** Create stored reports for every completed week (up to 12 back) that doesn't have one yet. Empty weeks are stored as empty. */
export async function ensureWeeklyReports(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } });
  if (!user) return;
  const current = weekStart(new Date());
  const first = new Date(Math.max(weekStart(user.createdAt).getTime(), current.getTime() - 12 * 7 * DAY));
  const existing = new Set((await prisma.weeklyReport.findMany({ where: { userId, weekStart: { gte: first } }, select: { weekStart: true } })).map((r) => r.weekStart.getTime()));
  for (let t = first.getTime(); t < current.getTime(); t += 7 * DAY) {
    if (existing.has(t)) continue;
    const stats = await computeWeekStats(userId, new Date(t));
    await prisma.weeklyReport
      .create({ data: { userId, weekStart: new Date(t), data: stats as unknown as Prisma.InputJsonValue } })
      .catch(() => {}); // a concurrent request may have created it
  }
}
