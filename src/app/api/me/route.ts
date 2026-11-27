import { z } from "zod";
import { prisma } from "@/lib/db";
import { destroySession, HttpError, requireUser, verifyPassword } from "@/lib/auth";
import { handler, json } from "@/lib/api";
import { deleteFile } from "@/lib/storage";

const Patch = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  targetBand: z.number().min(4).max(9).multipleOf(0.5).nullable().optional(),
  examDate: z.coerce.date().nullable().optional(),
  locale: z.enum(["en", "uz"]).optional(),
  reminderEnabled: z.boolean().optional(),
  reminderDays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
});

export const PATCH = handler(async (req: Request) => {
  const user = await requireUser();
  const data = Patch.parse(await req.json());
  if (data.reminderDays) data.reminderDays = [...new Set(data.reminderDays)].sort();
  await prisma.user.update({ where: { id: user.id }, data });
  return json({ ok: true });
});

/** Delete the account and everything stored for it, including audio files. Requires the password. */
export const DELETE = handler(async (req: Request) => {
  const user = await requireUser();
  const { password } = z.object({ password: z.string().min(1) }).parse(await req.json());
  const full = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await verifyPassword(password, full.passwordHash))) throw new HttpError(403, "Incorrect password.");
  if (full.role === "ADMIN" && (await prisma.user.count({ where: { role: "ADMIN" } })) <= 1) throw new HttpError(400, "The only owner account cannot be deleted.");
  const recs = await prisma.speakingRecording.findMany({ where: { session: { userId: user.id } }, select: { audioPath: true } });
  for (const r of recs) await deleteFile(r.audioPath).catch(() => {});
  await destroySession();
  await prisma.user.delete({ where: { id: user.id } });
  return json({ ok: true });
});
