import { prisma } from "@/lib/db";
import { Card, PageHeader } from "@/components/ui";
import { estimateCost } from "@/lib/ai/pricing";
import { isClaudeConfigured, isSttConfigured, isPronunciationConfigured } from "@/lib/ai/services";

export default async function AdminHome() {
  const now = Date.now();
  const d7 = new Date(now - 7 * 864e5);
  const d30 = new Date(now - 30 * 864e5);
  const [students, active7, writing, speaking, writing7, speaking7, views7, storage, usage30, writingTopics, speakingTopics] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.user.count({ where: { role: "STUDENT", lastActiveAt: { gte: d7 } } }),
    prisma.writingAttempt.count({ where: { status: { not: "DRAFT" } } }),
    prisma.speakingSession.count(),
    prisma.writingAttempt.count({ where: { createdAt: { gte: d7 } } }),
    prisma.speakingSession.count({ where: { createdAt: { gte: d7 } } }),
    prisma.pageView.count({ where: { createdAt: { gte: d7 } } }),
    prisma.speakingRecording.aggregate({ _sum: { sizeBytes: true }, _count: true }),
    prisma.aiUsageLog.groupBy({
      by: ["model"],
      where: { createdAt: { gte: d30 } },
      _sum: { inputTokens: true, outputTokens: true, cachedTokens: true },
      _count: true,
    }),
    prisma.$queryRaw<{ topic: string; n: bigint }[]>`SELECT q.topic, COUNT(*)::bigint AS n FROM "WritingAttempt" a JOIN "WritingQuestion" q ON q.id = a."questionId" GROUP BY q.topic`,
    prisma.$queryRaw<{ topic: string; n: bigint }[]>`SELECT t.topic, COUNT(*)::bigint AS n FROM "SpeakingSession" s JOIN "SpeakingTopic" t ON t.id = s."topicId" GROUP BY t.topic`,
  ]);
  const cost30 = usage30.reduce(
    (s, u) => s + estimateCost(u.model, u._sum.inputTokens ?? 0, u._sum.outputTokens ?? 0, u._sum.cachedTokens ?? 0),
    0,
  );
  const requests30 = usage30.reduce((s, u) => s + u._count, 0);
  const totals: Record<string, number> = {};
  for (const r of [...writingTopics, ...speakingTopics]) totals[r.topic] = (totals[r.topic] ?? 0) + Number(r.n);
  const topicTotals = Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 8);

  const stats = [
    ["Registered students", students],
    ["Active (7 days)", active7],
    ["Writing submissions", writing],
    ["Speaking sessions", speaking],
    ["Writing attempts (7 days)", writing7],
    ["Speaking sessions (7 days)", speaking7],
    ["Page views (7 days)", views7],
    ["AI requests (30 days)", requests30],
    ["Est. AI cost (30 days)", `$${cost30.toFixed(2)}`],
    ["Audio storage", `${((storage._sum.sizeBytes ?? 0) / 1048576).toFixed(1)} MB · ${storage._count} files`],
  ] as const;

  const services = [
    ["Claude AI (text analysis & assessment)", isClaudeConfigured()],
    ["Speech-to-text (Whisper-compatible)", isSttConfigured()],
    ["Pronunciation from audio (Azure Speech)", isPronunciationConfigured()],
  ] as const;

  return (
    <div>
      <PageHeader title="Platform analytics" subtitle="Live figures from the database. Everything on the platform is free for students." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-xs text-muted">{label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
          </Card>
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-semibold">Service configuration</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {services.map(([label, ok]) => (
              <li key={label} className="flex items-center justify-between gap-3">
                <span>{label}</span>
                <span className={ok ? "font-medium text-success" : "font-medium text-warning"}>{ok ? "Configured" : "Not configured"}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">
            Set these in the server environment (.env). Features that need a missing service tell students clearly instead of showing fake results.
          </p>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold">Most popular topics</h2>
          {topicTotals.length ? (
            <ul className="mt-3 space-y-1.5 text-sm">
              {topicTotals.map(([topic, n]) => (
                <li key={topic} className="flex justify-between">
                  <span>{topic}</span>
                  <span className="tabular-nums text-muted">{n}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">No practice sessions yet.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
