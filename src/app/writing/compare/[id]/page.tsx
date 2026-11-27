import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { isClaudeConfigured } from "@/lib/ai/services";
import { getCachedComparison } from "@/lib/compare-service";
import { BandCompare } from "@/components/BandCompare";
import { Task1Visual, type Visual } from "@/components/Task1Visual";
import { CategoryBadge, SourceBadge } from "@/components/QuestionMeta";
import { ButtonLink, Card, PageHeader } from "@/components/ui";

export const metadata = { title: "Band 6 / 7 / 8 comparison" };
export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/writing/compare/${id}`);
  const [{ locale }, q] = await Promise.all([getT(), prisma.writingQuestion.findUnique({ where: { id } })]);
  if (!q) notFound();
  const cached = await getCachedComparison("WRITING", id);
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link href={`/writing/practice/${id}`} className="text-sm text-muted hover:text-text">← Back to the question</Link>
      <PageHeader title="Band 6 → 7 → 8 comparison" subtitle="The same question answered at three levels. Switch between them or view them side by side." />
      <Card className="mb-6 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">{q.task === "TASK1" ? "Writing Task 1" : "Writing Task 2"}</span>
          <CategoryBadge category={q.category} locale={locale} />
          <SourceBadge source={q.source} note={q.sourceNote} reportedAt={q.reportedAt} locale={locale} />
          <ButtonLink href={`/writing/practice/${id}`} size="sm" variant="secondary" className="ml-auto">Write my own answer</ButtonLink>
        </div>
        <p className="mt-3 whitespace-pre-line text-sm">{q.prompt}</p>
        {q.visual && (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm text-muted">Show the visual</summary>
            <div className="mt-3">
              <Task1Visual visual={q.visual as unknown as Visual} />
            </div>
          </details>
        )}
      </Card>
      <BandCompare skill="WRITING" id={id} initial={cached} aiConfigured={isClaudeConfigured()} />
    </div>
  );
}
