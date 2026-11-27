import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { isClaudeConfigured, isPronunciationConfigured, isSttConfigured } from "@/lib/ai/services";
import { Alert, BandPill, Card, PageHeader } from "@/components/ui";
import { PartStarter } from "./PartStarter";
import { InterviewStarter } from "./InterviewStarter";

export const metadata = { title: "Speaking" };
export const dynamic = "force-dynamic";

export default async function SpeakingHome() {
  const [{ t }, user] = await Promise.all([getT(), getCurrentUser()]);
  const [counts, recent] = await Promise.all([
    prisma.speakingTopic.groupBy({ by: ["part"], where: { isActive: true }, _count: true }),
    user
      ? prisma.speakingSession.findMany({
          where: { userId: user.id },
          orderBy: { updatedAt: "desc" },
          take: 8,
          include: { topic: { select: { title: true, part: true } }, assessments: { select: { attempt: true, overallBand: true, fcBand: true, lrBand: true, graBand: true } }, _count: { select: { recordings: true } } },
        })
      : [],
  ]);
  const n = (p: number) => counts.find((c) => c.part === p)?._count ?? 0;
  const stt = isSttConfigured();
  const parts = [
    { part: 1, title: t("speaking.part1"), desc: t("speaking.part1.desc") },
    { part: 2, title: t("speaking.part2"), desc: t("speaking.part2.desc") },
    { part: 3, title: t("speaking.part3"), desc: t("speaking.part3.desc") },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader title={t("speaking.title")} subtitle={t("speaking.micTip")} />
      {(!stt || !isClaudeConfigured()) && (
        <div className="mb-6">
          <Alert tone="warning" title="Some Speaking services are not configured yet">
            You can record and play back answers now.{" "}
            {!stt && "Transcripts need a speech-to-text service. "}
            {!isClaudeConfigured() && "Preparation and assessment need the Claude AI service. "}
            {!isPronunciationConfigured() && "Pronunciation is only scored when an audio pronunciation service is configured; otherwise it is shown as not assessed."}
          </Alert>
        </div>
      )}
      <div className="grid gap-5 md:grid-cols-3">
        {parts.map((p) => (
          <PartStarter key={p.part} part={p.part} title={p.title} desc={p.desc} count={n(p.part)} signedIn={!!user} />
        ))}
      </div>
      <InterviewStarter signedIn={!!user} />

      {user && (
        <Card className="mt-8 p-5">
          <h2 className="font-semibold">{t("speaking.recent")}</h2>
          <ul className="mt-3 divide-y divide-border text-sm">
            {recent.map((s) => {
              const a1 = s.assessments.find((a) => a.attempt === 1);
              const a2 = s.assessments.find((a) => a.attempt === 2);
              const prov = (a?: { fcBand: number; lrBand: number; graBand: number; overallBand: number | null }) =>
                a ? (a.overallBand ?? Math.round(((a.fcBand + a.lrBand + a.graBand) / 3) * 2) / 2) : null;
              return (
                <li key={s.id}>
                  <Link href={s.mode === "INTERVIEW" ? `/speaking/interview/${s.id}` : `/speaking/practice/${s.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-primary">
                    <span className="min-w-0 truncate">
                      {s.mode === "INTERVIEW" ? "AI examiner interview" : `Part ${s.topic?.part} · ${s.topic?.title}`}
                      <span className="ml-2 text-xs text-muted">{s._count.recordings} recordings · {s.updatedAt.toLocaleDateString("en-GB")}</span>
                    </span>
                    <span className="flex gap-1">
                      {a1 && <BandPill band={prov(a1)} label="1st" />}
                      {a2 && <BandPill band={prov(a2)} label="2nd" />}
                    </span>
                  </Link>
                </li>
              );
            })}
            {!recent.length && <li className="py-2.5 text-muted">No sessions yet.</li>}
          </ul>
        </Card>
      )}
    </div>
  );
}
