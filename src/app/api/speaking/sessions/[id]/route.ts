import { prisma } from "@/lib/db";
import { requireUser, HttpError } from "@/lib/auth";
import { handler, json } from "@/lib/api";
import { speakingSessionView } from "@/lib/speaking-view";
import { deleteFile } from "@/lib/storage";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (_req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  return json(await speakingSessionView(id, user.id));
});

export const DELETE = handler(async (_req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const s = await prisma.speakingSession.findFirst({ where: { id, userId: user.id }, include: { recordings: { select: { audioPath: true } } } });
  if (!s) throw new HttpError(404, "Speaking session not found.");
  for (const r of s.recordings) await deleteFile(r.audioPath).catch(() => {});
  await prisma.speakingSession.delete({ where: { id } });
  return json({ ok: true });
});
