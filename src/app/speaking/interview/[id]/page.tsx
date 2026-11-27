import { notFound, redirect } from "next/navigation";
import { getCurrentUser, HttpError } from "@/lib/auth";
import { speakingSessionView } from "@/lib/speaking-view";
import { isClaudeConfigured, isPronunciationConfigured, isSttConfigured } from "@/lib/ai/services";
import { InterviewRoom } from "./InterviewRoom";

export const dynamic = "force-dynamic";
export const metadata = { title: "AI examiner interview" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/speaking/interview/${id}`);
  let view;
  try {
    view = await speakingSessionView(id, user.id);
  } catch (e) {
    if (e instanceof HttpError) notFound();
    throw e;
  }
  if (view.mode !== "INTERVIEW") redirect(`/speaking/practice/${id}`);
  return <InterviewRoom initial={view} services={{ stt: isSttConfigured(), ai: isClaudeConfigured(), pronunciation: isPronunciationConfigured() }} />;
}
