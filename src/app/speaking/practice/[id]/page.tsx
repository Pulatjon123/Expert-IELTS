import { notFound, redirect } from "next/navigation";
import { getCurrentUser, HttpError } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { speakingSessionView } from "@/lib/speaking-view";
import { isClaudeConfigured, isPronunciationConfigured, isSttConfigured } from "@/lib/ai/services";
import { prisma } from "@/lib/db";
import { SpeakingPrepSchema } from "@/lib/ai/speaking";
import { SpeakingWorkspace } from "./SpeakingWorkspace";
import { FocusPanel } from "@/components/FocusPanel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Speaking practice" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/speaking/practice/${id}`);
  const { locale } = await getT();
  let view;
  try {
    view = await speakingSessionView(id, user.id);
  } catch (e) {
    if (e instanceof HttpError) notFound();
    throw e;
  }
  if (view.mode === "INTERVIEW") redirect(`/speaking/interview/${id}`);
  // Preparation is only shown once the first attempt exists (enforced again by the API).
  const prep = view.recordings.some((r) => r.attempt === 1) ? await prisma.speakingPrep.findUnique({ where: { topicId: view.topic.id } }) : null;
  const parsed = prep ? SpeakingPrepSchema.safeParse(prep.content) : null;
  const bookmark = await prisma.bookmark.findUnique({ where: { userId_skill_questionId: { userId: user.id, skill: "SPEAKING", questionId: view.topic.id } } });
  return (
    <SpeakingWorkspace
      initial={view}
      locale={locale}
      initialPrep={parsed?.success ? parsed.data : null}
      bookmarked={!!bookmark}
      focus={<FocusPanel userId={user.id} skill="SPEAKING" />}
      services={{ stt: isSttConfigured(), ai: isClaudeConfigured(), pronunciation: isPronunciationConfigured() }}
    />
  );
}
