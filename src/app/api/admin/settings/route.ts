import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handler, json } from "@/lib/api";
import { getAiSettings, saveAiSettings } from "@/lib/ai/settings";
import { getHomepageContent } from "@/lib/site";

const Ai = z.object({
  primaryModel: z.string().trim().min(3).max(100),
  fastModel: z.string().trim().min(3).max(100),
  dailyRequestsPerUser: z.coerce.number().int().min(1).max(10000),
  useFallbacks: z.boolean(),
  instructions: z.record(z.string(), z.string().max(4000)),
});
const Home = z.object({
  en: z.object({ title: z.string().max(200).optional(), subtitle: z.string().max(400).optional() }),
  uz: z.object({ title: z.string().max(200).optional(), subtitle: z.string().max(400).optional() }),
});

export const GET = handler(async () => {
  await requireAdmin();
  return json({ ai: await getAiSettings(), homepage: await getHomepageContent() });
});

export const PUT = handler(async (req: Request) => {
  await requireAdmin();
  const body = z.object({ ai: Ai.optional(), homepage: Home.optional() }).parse(await req.json());
  if (body.ai) await saveAiSettings(body.ai);
  if (body.homepage)
    await prisma.setting.upsert({ where: { key: "homepage" }, create: { key: "homepage", value: body.homepage }, update: { value: body.homepage } });
  return json({ ok: true });
});
