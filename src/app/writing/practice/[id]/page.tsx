import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { isClaudeConfigured } from "@/lib/ai/services";
import { WritingPrepSchema } from "@/lib/ai/writing";
import { WritingWorkspace } from "./WritingWorkspace";
import { FocusPanel } from "@/components/FocusPanel";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/writing/practice/${id}`);
  const [{ locale }, question] = await Promise.all([getT(), prisma.writingQuestion.findUnique({ where: { id } })]);
  if (!question || (!question.isActive && user.role !== "ADMIN")) notFound();
  const [bookmark, prep, previous] = await Promise.all([
    prisma.bookmark.findUnique({ where: { userId_skill_questionId: { userId: user.id, skill: "WRITING", questionId: id } } }),
    prisma.writingPrep.findUnique({ where: { questionId: id } }),
    prisma.writingAttempt.findMany({
      where: { userId: user.id, questionId: id, status: "EVALUATED" },
      orderBy: { submittedAt: "desc" },
      select: { id: true, submittedAt: true, assessment: { select: { overallBand: true } } },
    }),
  ]);
  const parsedPrep = prep ? WritingPrepSchema.safeParse(prep.content) : null;

  return (
    <WritingWorkspace
      locale={locale}
      question={{
        id: question.id,
        task: question.task,
        category: question.category,
        topic: question.topic,
        prompt: question.prompt,
        visual: question.visual as never,
        imageUrl: question.imageUrl,
        source: question.source,
        sourceNote: question.sourceNote,
        reportedAt: question.reportedAt?.toISOString() ?? null,
      }}
      initialBookmarked={!!bookmark}
      initialPrep={parsedPrep?.success ? parsedPrep.data : null}
      aiConfigured={isClaudeConfigured()}
      focus={<FocusPanel userId={user.id} skill="WRITING" />}
      previous={previous.map((p) => ({ id: p.id, date: p.submittedAt?.toISOString() ?? "", band: p.assessment?.overallBand ?? null }))}
    />
  );
}
