import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handler, json } from "@/lib/api";

const Item = z.object({
  expression: z.string().trim().min(2).max(200),
  kind: z.enum(["WORD", "COLLOCATION", "PHRASE"]),
  uzbek: z.string().trim().max(300).optional().nullable(),
  definition: z.string().trim().max(600).optional().nullable(),
  example: z.string().trim().max(600).optional().nullable(),
  topic: z.string().trim().max(80).optional().nullable(),
  sourceSkill: z.enum(["WRITING", "SPEAKING"]).optional().nullable(),
});

export const GET = handler(async () => {
  const user = await requireUser();
  const items = await prisma.vocabItem.findMany({ where: { userId: user.id }, select: { expression: true } });
  return json({ expressions: items.map((i) => i.expression) });
});

/** Save an expression to the personal vocabulary bank (idempotent per expression). */
export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const data = Item.parse(await req.json());
  const item = await prisma.vocabItem.upsert({
    where: { userId_expression: { userId: user.id, expression: data.expression } },
    create: { ...data, userId: user.id },
    update: {},
  });
  return json({ item });
});
