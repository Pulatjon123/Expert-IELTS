import Link from "next/link";
import { redirect } from "next/navigation";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isClaudeConfigured } from "@/lib/ai/services";
import { assessedCounts, DAY, lastWeeks, weekLabel } from "@/lib/stats";
import { Badge, ButtonLink, Card, PageHeader } from "@/components/ui";
import { MiniBars } from "@/components/charts";
import { WeaknessActions } from "./WeaknessActions";

export const metadata = { title: "Weakness tracker" };
export const dynamic = "force-dynamic";

const SEVERITY = { 1: "Minor", 2: "Moderate", 3: "Serious" } as const;

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/weaknesses");
  const now = new Date();
  const weeks = lastWeeks(8, now);
  const [items, recent, previous] = await Promise.all([
    prisma.weakness.findMany({
      where: { userId: user.id },
      include: { occurrences: { orderBy: { createdAt: "desc" } } },
      orderBy: [{ status: "asc" }, { severity: "desc" }, { lastSeen: "desc" }],
    }),
    assessedCounts(user.id, new Date(now.getTime() - 30 * DAY), now),
    assessedCounts(user.id, new Date(now.getTime() - 60 * DAY), new Date(now.getTime() - 30 * DAY)),
  ]);
  const totals = { ACTIVE: 0, IMPROVING: 0, RESOLVED: 0 };
  for (const w of items) totals[w.status]++;
  const aiConfigured = isClaudeConfigured();

  // Source links for examples.
  const sourceIds = [...new Set(items.flatMap((w) => w.occurrences.map((o) => o.sourceId)))];
  const [wAttempts, sSessions] = await Promise.all([
    prisma.writingAttempt.findMany({ where: { id: { in: sourceIds }, userId: user.id }, select: { id: true } }),
    prisma.speakingSession.findMany({ where: { id: { in: sourceIds }, userId: user.id }, select: { id: true, mode: true } }),
  ]);
  const href = (id: string) =>
    wAttempts.some((a) => a.id === id)
      ? `/writing/attempts/${id}`
      : sSessions.find((s) => s.id === id)?.mode === "INTERVIEW"
        ? `/speaking/interview/${id}`
        : sSessions.some((s) => s.id === id)
          ? `/speaking/practice/${id}`
          : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Personal weakness tracker"
        subtitle="Your recurring mistakes across Writing and Speaking, detected in your assessed answers. A weakness moves to “improving” after 2 clean attempts and to “resolved” after 4."
      />
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["Active", totals.ACTIVE, "text-danger"],
          ["Improving", totals.IMPROVING, "text-warning"],
          ["Resolved", totals.RESOLVED, "text-success"],
          ["Assessed answers (30 days)", recent.total, ""],
        ].map(([label, n, cls]) => (
          <Card key={label as string} className="p-4">
            <p className="text-xs text-muted">{label}</p>
            <p className={`mt-1 text-2xl font-semibold tabular-nums ${cls}`}>{n}</p>
          </Card>
        ))}
      </div>

      {!items.length && (
        <Card className="mt-6 p-8 text-center">
          <p className="font-semibold">No patterns tracked yet</p>
          <p className="mt-1 text-sm text-muted">Submit an essay or analyse a speaking attempt — recurring mistakes will appear here automatically.</p>
          <div className="mt-4 flex justify-center gap-2">
            <ButtonLink href="/writing">Practise Writing</ButtonLink>
            <ButtonLink href="/speaking" variant="secondary">Practise Speaking</ButtonLink>
          </div>
        </Card>
      )}

      <div className="mt-6 space-y-4">
        {items.map((w) => {
          const last30 = w.occurrences.filter((o) => o.createdAt.getTime() > now.getTime() - 30 * DAY).length;
          const prev30 = w.occurrences.filter((o) => o.createdAt.getTime() <= now.getTime() - 30 * DAY && o.createdAt.getTime() > now.getTime() - 60 * DAY).length;
          // Rate = occurrences per assessed answer, so practising more doesn't look like "getting worse".
          const rateNow = recent.total ? last30 / recent.total : null;
          const ratePrev = previous.total ? prev30 / previous.total : null;
          const trend = rateNow == null || ratePrev == null ? null : rateNow < ratePrev - 0.05 ? "down" : rateNow > ratePrev + 0.05 ? "up" : "flat";
          const series = weeks.map((ws, i) => ({
            label: weekLabel(ws),
            value: w.occurrences.filter((o) => o.createdAt >= ws && (i === weeks.length - 1 || o.createdAt < weeks[i + 1])).length,
          }));
          return (
            <Card key={w.id} className="p-5">
              <div className="flex flex-col gap-4 lg:flex-row">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">{w.name}</h2>
                    <Badge tone={w.status === "RESOLVED" ? "success" : w.status === "IMPROVING" ? "warning" : "danger"}>{w.status.toLowerCase()}</Badge>
                    <Badge tone={w.severity >= 3 ? "danger" : w.severity === 2 ? "warning" : "neutral"}>{SEVERITY[w.severity as 1 | 2 | 3]}</Badge>
                    {w.skills.map((s) => (
                      <Badge key={s}>{s.toLowerCase()}</Badge>
                    ))}
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    Seen {w.occurrences.length}× in total · {last30}× in the last 30 days · first {w.firstSeen.toLocaleDateString("en-GB")} · last {w.lastSeen.toLocaleDateString("en-GB")}
                  </p>
                  <p className="mt-3 text-sm">{w.explanation}</p>
                  <p className="mt-3 text-sm">
                    <span className="font-semibold">Recommended practice: </span>
                    {w.recommendedPractice}
                  </p>
                  <div className="mt-3 space-y-2">
                    {w.occurrences.slice(0, 3).map((o) => {
                      const link = href(o.sourceId);
                      return (
                        <div key={o.id} className="rounded-lg bg-surface-2 p-3 text-sm">
                          <p>
                            <span className="text-danger">“{o.example}”</span>
                            {o.correction && (
                              <>
                                {" "}→ <span className="text-success">{o.correction}</span>
                              </>
                            )}
                          </p>
                          <p className="mt-1 text-xs text-muted">
                            {o.skill.toLowerCase()} · {o.createdAt.toLocaleDateString("en-GB")}
                            {link && (
                              <>
                                {" · "}
                                <Link href={link} className="text-primary hover:underline">view answer</Link>
                              </>
                            )}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="lg:w-64">
                  <p className="text-xs font-medium text-muted">Occurrences per week</p>
                  <MiniBars data={series} />
                  {trend && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs">
                      {trend === "down" ? <TrendingDown className="h-4 w-4 text-success" /> : trend === "up" ? <TrendingUp className="h-4 w-4 text-danger" /> : <Minus className="h-4 w-4 text-muted" />}
                      {trend === "down" ? "Less frequent than the previous 30 days" : trend === "up" ? "More frequent than the previous 30 days" : "About the same as the previous 30 days"}
                    </p>
                  )}
                </div>
              </div>
              <WeaknessActions id={w.id} status={w.status} aiConfigured={aiConfigured} />
            </Card>
          );
        })}
      </div>
    </div>
  );
}
