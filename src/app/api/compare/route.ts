import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { handler, json } from "@/lib/api";
import { getOrCreateComparison } from "@/lib/compare-service";

export const maxDuration = 300;

export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const b = z
    .object({ skill: z.enum(["WRITING", "SPEAKING"]), id: z.string().min(1).max(40), index: z.number().int().min(0).max(30).default(0) })
    .parse(await req.json());
  return json({ comparison: await getOrCreateComparison(b.skill, b.id, b.index, user.id) });
});
