import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, HttpError } from "@/lib/auth";
import { handler, json } from "@/lib/api";
import { countWords } from "@/lib/ielts";

type Ctx = { params: Promise<{ id: string }> };

const Body = z.object({
  content: z.string().max(30000),
  timeSpentSec: z.number().int().min(0).max(60 * 60 * 12),
  /** true when the student clicks "Save draft": also stores a version in the draft history. */
  snapshot: z.boolean().optional(),
});

export const PATCH = handler(async (req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const body = Body.parse(await req.json());
  const attempt = await prisma.writingAttempt.findFirst({ where: { id, userId: user.id }, select: { status: true } });
  if (!attempt) throw new HttpError(404, "Attempt not found.");
  if (attempt.status === "SUBMITTED" || attempt.status === "EVALUATED") throw new HttpError(409, "This attempt has already been submitted.");
  const wordCount = countWords(body.content);
  const updated = await prisma.writingAttempt.update({
    where: { id },
    data: { content: body.content, wordCount, timeSpentSec: body.timeSpentSec, status: "DRAFT" },
    select: { id: true, updatedAt: true, wordCount: true },
  });
  if (body.snapshot && body.content.trim()) {
    const last = await prisma.writingDraftVersion.findFirst({ where: { attemptId: id }, orderBy: { createdAt: "desc" }, select: { content: true } });
    if (last?.content !== body.content) await prisma.writingDraftVersion.create({ data: { attemptId: id, content: body.content, wordCount } });
  }
  return json({ attempt: updated });
});

export const DELETE = handler(async (_req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const { count } = await prisma.writingAttempt.deleteMany({ where: { id, userId: user.id } });
  if (!count) throw new HttpError(404, "Attempt not found.");
  return json({ ok: true });
});
