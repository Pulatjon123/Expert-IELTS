import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { VocabularyApp, type VocabEntry } from "./VocabularyApp";

export const metadata = { title: "Vocabulary" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/vocabulary");
  const items = await prisma.vocabItem.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { usages: { orderBy: { createdAt: "desc" } } },
  });
  const entries: VocabEntry[] = items.map((i) => ({
    id: i.id,
    expression: i.expression,
    kind: i.kind,
    uzbek: i.uzbek,
    definition: i.definition,
    example: i.example,
    topic: i.topic,
    learned: i.learned,
    sourceSkill: i.sourceSkill,
    createdAt: i.createdAt.toISOString(),
    usages: i.usages.map((u) => ({ id: u.id, skill: u.skill, verdict: u.verdict, context: u.context, comment: u.comment, createdAt: u.createdAt.toISOString() })),
  }));
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Vocabulary bank"
        subtitle="Expressions you saved from preparation sessions. The tracker checks your essays and spoken answers to see whether you actually use them — correctly and naturally."
      />
      <VocabularyApp initial={entries} />
    </div>
  );
}
