import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { handler, json } from "@/lib/api";

export const POST = handler(async (req: Request) => {
  const parsed = z.object({ path: z.string().max(300) }).safeParse(JSON.parse((await req.text()) || "{}"));
  if (!parsed.success) return json({ ok: false }, { status: 400 });
  const user = await getCurrentUser();
  await prisma.pageView.create({ data: { path: parsed.data.path, userId: user?.id ?? null } });
  return json({ ok: true });
});
