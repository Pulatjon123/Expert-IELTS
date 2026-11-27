import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { BandPill, Card, PageHeader } from "@/components/ui";
import { TaskStarter } from "./TaskStarter";
import { isClaudeConfigured } from "@/lib/ai/services";

export const metadata = { title: "Writing" };
export const dynamic = "force-dynamic";

export default async function WritingHome() {
  const [{ t, locale }, user] = await Promise.all([getT(), getCurrentUser()]);
  const aiConfigured = isClaudeConfigured();
  const [counts, recent, bookmarks] = await Promise.all([
    prisma.writingQuestion.groupBy({ by: ["task", "category"], where: { isActive: true }, _count: true }),
    user
      ? prisma.writingAttempt.findMany({
          where: { userId: user.id },
          orderBy: { updatedAt: "desc" },
          take: 8,
          include: { question: { select: { task: true, topic: true, category: true } }, assessment: { select: { overallBand: true } } },
        })
      : [],
    user
      ? prisma.bookmark.findMany({ where: { userId: user.id, skill: "WRITING" }, orderBy: { createdAt: "desc" }, take: 10 })
      : [],
  ]);
  const bookmarked = bookmarks.length
    ? await prisma.writingQuestion.findMany({ where: { id: { in: bookmarks.map((b) => b.questionId) } }, select: { id: true, task: true, topic: true, prompt: true } })
    : [];
  const byTask = (task: "TASK1" | "TASK2") =>
    Object.fromEntries(counts.filter((c) => c.task === task).map((c) => [c.category, c._count])) as Record<string, number>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader title={t("writing.title")} subtitle={t("common.free")} />
      <div className="grid gap-6 md:grid-cols-2">
        <TaskStarter task="TASK1" title={t("writing.task1")} desc={t("writing.task1.desc")} counts={byTask("TASK1")} signedIn={!!user} locale={locale} aiConfigured={aiConfigured} />
        <TaskStarter task="TASK2" title={t("writing.task2")} desc={t("writing.task2.desc")} counts={byTask("TASK2")} signedIn={!!user} locale={locale} aiConfigured={aiConfigured} />
      </div>

      {user && (
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <Card className="p-5">
            <h2 className="font-semibold">Your recent writing</h2>
            <ul className="mt-3 divide-y divide-border text-sm">
              {recent.map((a) => (
                <li key={a.id}>
                  <Link
                    href={a.status === "EVALUATED" ? `/writing/attempts/${a.id}` : `/writing/practice/${a.questionId}`}
                    className="flex items-center justify-between gap-3 py-2.5 hover:text-primary"
                  >
                    <span className="min-w-0 truncate">
                      {a.question.task === "TASK1" ? "Task 1" : "Task 2"} · {a.question.topic}
                      <span className="ml-2 text-xs text-muted">
                        {a.status === "EVALUATED" ? "" : a.status === "FAILED" ? "evaluation failed — retry" : `draft · ${a.wordCount} words`}
                      </span>
                    </span>
                    {a.assessment && <BandPill band={a.assessment.overallBand} />}
                  </Link>
                </li>
              ))}
              {!recent.length && <li className="py-2.5 text-muted">No essays yet — start with a question above.</li>}
            </ul>
          </Card>
          <Card className="p-5">
            <h2 className="font-semibold">Bookmarked questions</h2>
            <ul className="mt-3 divide-y divide-border text-sm">
              {bookmarked.map((q) => (
                <li key={q.id}>
                  <Link href={`/writing/practice/${q.id}`} className="block py-2.5 hover:text-primary">
                    <span className="text-xs font-medium text-muted">{q.task === "TASK1" ? "Task 1" : "Task 2"} · {q.topic}</span>
                    <span className="line-clamp-1">{q.prompt}</span>
                  </Link>
                </li>
              ))}
              {!bookmarked.length && <li className="py-2.5 text-muted">Bookmark questions to practise them later.</li>}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
