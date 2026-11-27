import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { BandPill, Badge, Card, PageHeader } from "@/components/ui";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      writingAttempts: { orderBy: { createdAt: "desc" }, take: 20, include: { question: { select: { task: true, topic: true } }, assessment: { select: { overallBand: true } } } },
      speakingSessions: { orderBy: { createdAt: "desc" }, take: 20, include: { topic: { select: { title: true } }, assessments: { select: { attempt: true, overallBand: true } } } },
      weaknesses: { orderBy: { lastSeen: "desc" }, take: 10, include: { _count: { select: { occurrences: true } } } },
      _count: { select: { vocabItems: true } },
    },
  });
  if (!user) notFound();
  return (
    <div>
      <Link href="/admin/students" className="text-sm text-muted hover:text-text">← Students</Link>
      <PageHeader title={user.name} subtitle={`${user.email} · joined ${user.createdAt.toLocaleDateString("en-GB")} · ${user._count.vocabItems} saved expressions`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-semibold">Writing attempts</h2>
          <ul className="mt-3 divide-y divide-border text-sm">
            {user.writingAttempts.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                <span>{a.question.task === "TASK1" ? "Task 1" : "Task 2"} · {a.question.topic} <span className="text-muted">({a.status.toLowerCase()})</span></span>
                <BandPill band={a.assessment?.overallBand} />
              </li>
            ))}
            {!user.writingAttempts.length && <li className="py-2 text-muted">None yet.</li>}
          </ul>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold">Speaking sessions</h2>
          <ul className="mt-3 divide-y divide-border text-sm">
            {user.speakingSessions.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                <span>{s.mode === "INTERVIEW" ? "Interview" : `Part ${s.part}`} · {s.topic?.title ?? "—"}</span>
                <span className="flex gap-1">{s.assessments.map((a) => <BandPill key={a.attempt} band={a.overallBand} />)}</span>
              </li>
            ))}
            {!user.speakingSessions.length && <li className="py-2 text-muted">None yet.</li>}
          </ul>
        </Card>
        <Card className="p-5 lg:col-span-2">
          <h2 className="font-semibold">Tracked weaknesses</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {user.weaknesses.map((w) => (
              <Badge key={w.id} tone={w.status === "RESOLVED" ? "success" : w.severity >= 3 ? "danger" : "warning"}>
                {w.name} · {w._count.occurrences}×
              </Badge>
            ))}
            {!user.weaknesses.length && <p className="text-sm text-muted">No patterns detected yet.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
