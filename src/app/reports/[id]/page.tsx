import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isClaudeConfigured } from "@/lib/ai/services";
import type { WeekStats } from "@/lib/reports";
import { PageHeader } from "@/components/ui";
import { ReportView } from "@/components/ReportView";
import { PrintButton } from "@/components/PrintButton";
import { AiSummary } from "../AiSummary";

export const metadata = { title: "Weekly report" };
export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/reports/${id}`);
  const report = await prisma.weeklyReport.findFirst({ where: { id, userId: user.id } });
  if (!report) notFound();
  const s = report.data as unknown as WeekStats;
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="print:hidden">
        <Link href="/reports" className="text-sm text-muted hover:text-text">← All reports</Link>
      </div>
      <PageHeader title={`Week of ${report.weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`}>
        <PrintButton />
      </PageHeader>
      <ReportView s={s} aiSlot={s.empty ? null : <AiSummary reportId={report.id} initial={s.ai ?? null} aiConfigured={isClaudeConfigured()} />} />
    </div>
  );
}
