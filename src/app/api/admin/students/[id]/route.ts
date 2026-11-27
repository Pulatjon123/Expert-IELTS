import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, HttpError } from "@/lib/auth";
import { handler, json } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };
const Body = z.object({ status: z.enum(["ACTIVE", "SUSPENDED"]).optional(), role: z.enum(["STUDENT", "ADMIN"]).optional() });

export const PATCH = handler(async (req: Request, { params }: Ctx) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const body = Body.parse(await req.json());
  if (id === admin.id && (body.status === "SUSPENDED" || body.role === "STUDENT")) throw new HttpError(400, "You cannot suspend or demote your own account.");
  const user = await prisma.user.update({ where: { id }, data: body, select: { id: true, status: true, role: true } });
  if (body.status === "SUSPENDED") await prisma.session.deleteMany({ where: { userId: id } });
  return json({ user });
});

export const DELETE = handler(async (_req: Request, { params }: Ctx) => {
  const admin = await requireAdmin();
  const { id } = await params;
  if (id === admin.id) throw new HttpError(400, "You cannot delete your own account.");
  await prisma.user.delete({ where: { id } });
  return json({ ok: true });
});
