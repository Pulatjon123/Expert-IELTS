import { prisma } from "@/lib/db";
import { requireUser, HttpError } from "@/lib/auth";
import { handler, json } from "@/lib/api";

export const GET = handler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await params;
  const attempt = await prisma.writingAttempt.findFirst({ where: { id, userId: user.id }, select: { id: true } });
  if (!attempt) throw new HttpError(404, "Attempt not found.");
  const versions = await prisma.writingDraftVersion.findMany({ where: { attemptId: id }, orderBy: { createdAt: "desc" }, take: 50 });
  return json({ versions });
});
