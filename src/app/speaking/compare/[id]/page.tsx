import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isClaudeConfigured } from "@/lib/ai/services";
import { topicQuestions } from "@/lib/ai/speaking";
import { compareKey, getCachedComparison } from "@/lib/compare-service";
import { BandCompare } from "@/components/BandCompare";
import { Card, PageHeader, cn } from "@/components/ui";

export const metadata = { title: "Band 6 / 7 / 8 comparison" };
export const dynamic = "force-dynamic";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ q?: string; from?: string }> }) {
  const { id } = await params;
  const { q, from } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/speaking/compare/${id}`);
  const topic = await prisma.speakingTopic.findUnique({ where: { id } });
  if (!topic) notFound();
  const questions = topicQuestions(topic);
  const index = Math.min(Math.max(0, Number(q) || 0), questions.length - 1);
  const cached = await getCachedComparison("SPEAKING", compareKey("SPEAKING", id, index));
  const back = from && /^[a-z0-9]+$/i.test(from) ? `/speaking/practice/${from}` : "/speaking";
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link href={back} className="text-sm text-muted hover:text-text">← Back</Link>
      <PageHeader title="Band 6 → 7 → 8 comparison" subtitle={`Speaking Part ${topic.part} · ${topic.title}. Choose a question, then compare how it is answered at three levels.`} />
      {questions.length > 1 && (
        <Card className="mb-5 p-3">
          <ol className="flex flex-col gap-1">
            {questions.map((qq, i) => (
              <li key={i}>
                <Link
                  href={`/speaking/compare/${id}?q=${i}${from ? `&from=${from}` : ""}`}
                  className={cn("block rounded-lg px-3 py-2 text-sm", i === index ? "bg-primary-soft font-medium text-primary" : "hover:bg-surface-2")}
                >
                  {i + 1}. {qq}
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      )}
      {questions.length === 1 && (
        <Card className="mb-5 whitespace-pre-line p-5 text-sm">{questions[0]}</Card>
      )}
      <BandCompare key={index} skill="SPEAKING" id={id} index={index} initial={cached} aiConfigured={isClaudeConfigured()} />
    </div>
  );
}
