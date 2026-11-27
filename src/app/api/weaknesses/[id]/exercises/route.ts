import { prisma } from "@/lib/db";
import { requireUser, HttpError } from "@/lib/auth";
import { handler, json } from "@/lib/api";
import { generateExercises } from "@/lib/ai/exercises";

export const maxDuration = 120;

/** Targeted exercises built from the student's own recorded mistakes for one weakness. */
export const POST = handler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await params;
  const w = await prisma.weakness.findFirst({
    where: { id, userId: user.id },
    include: { occurrences: { orderBy: { createdAt: "desc" }, take: 6, select: { example: true, correction: true } } },
  });
  if (!w) throw new HttpError(404, "Weakness not found.");
  const { data } = await generateExercises({ name: w.name, explanation: w.explanation, examples: w.occurrences, userId: user.id });
  return json({ set: data });
});

/** Students can mark a weakness as resolved themselves (it re-opens automatically if the mistake appears again). */
export const PATCH = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await params;
  const body = (await req.json()) as { status?: string };
  if (body.status !== "RESOLVED" && body.status !== "ACTIVE") throw new HttpError(400, "Invalid status.");
  const { count } = await prisma.weakness.updateMany({ where: { id, userId: user.id }, data: { status: body.status } });
  if (!count) throw new HttpError(404, "Weakness not found.");
  return json({ ok: true });
});
