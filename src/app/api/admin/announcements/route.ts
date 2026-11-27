import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handler, json } from "@/lib/api";

export const POST = handler(async (req: Request) => {
  await requireAdmin();
  const data = z.object({ title: z.string().trim().min(2).max(120), body: z.string().trim().min(2).max(1000) }).parse(await req.json());
  return json({ item: await prisma.announcement.create({ data }) }, { status: 201 });
});
