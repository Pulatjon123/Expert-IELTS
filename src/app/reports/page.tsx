import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { computeWeekStats, ensureWeeklyReports, type WeekStats } from "@/lib/reports";
import { weekStart } from "@/lib/stats";
import { BandPill, Card, PageHeader } from "@/components/ui";
import { BandTrend } from "@/components/charts";
import { ReportView } from "@/components/ReportView";

export const metadata = { title: "Weekly reports" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/reports");
  await ensureWeeklyReports(user.id);
  const [reports, current] = await Promise.all([
    prisma.weeklyReport.findMany({ where: { userId: user.id }, orderBy: { weekStart: "desc" }, take: 52 }),
    computeWeekStats(user.id, weekStart(new Date())),
  ]);
  const past = reports.map((r) => ({ id: r.id, weekStart: r.weekStart, s: r.data as unknown as WeekStats })).filter((r) => !r.s.empty);
  const trend = [...past]
    .reverse()
    .slice(-12)
    .map((r) => ({ label: r.weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), writing: r.s.writing.avgBand, speaking: r.s.speaking.avgBand }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader title="Weekly performance reports" subtitle="A report is created automatically for every week you practise. Figures are measured from your assessed answers; the coach summary is written by AI from those figures." />
      {trend.length > 1 && (
        <Card className="mb-6 p-5">
          <h2 className="font-semibold">Average band by week</h2>
          <BandTrend data={trend} height={220} />
        </Card>
      )}
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card className="h-fit p-3">
          <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted">Previous reports</p>
          <ul className="mt-1">
            {past.map((r) => (
              <li key={r.id}>
                <Link href={`/reports/${r.id}`} className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm hover:bg-surface-2">
                  <span>Week of {r.weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                  <span className="flex gap-1">
                    {r.s.writing.avgBand != null && <BandPill band={r.s.writing.avgBand} label="W" />}
                    {r.s.speaking.avgBand != null && <BandPill band={r.s.speaking.avgBand} label="S" />}
                  </span>
                </Link>
              </li>
            ))}
            {!past.length && <li className="px-2 py-2 text-sm text-muted">Your first report appears after your first week of practice.</li>}
          </ul>
        </Card>
        <div>
          <h2 className="mb-2 font-display text-2xl font-semibold">This week so far</h2>
          {current.empty ? (
            <Card className="p-6 text-sm text-muted">No practice yet this week. Complete an essay or a speaking session and your live report will appear here.</Card>
          ) : (
            <ReportView s={current} />
          )}
        </div>
      </div>
    </div>
  );
}
