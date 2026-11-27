import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { handler, json } from "@/lib/api";
import { SpeakingTopicInput, WritingQuestionInput } from "@/lib/validators";

const Body = z.object({
  writing: z.array(z.unknown()).max(500).default([]),
  speaking: z.array(z.unknown()).max(500).default([]),
});

/** Bulk import. Every row is validated; rows with errors are reported and skipped, valid rows are inserted. */
export const POST = handler(async (req: Request) => {
  await requireAdmin();
  const body = Body.parse(await req.json());
  const errors: { kind: string; index: number; message: string }[] = [];
  const writing = body.writing.flatMap((row, index) => {
    const r = WritingQuestionInput.safeParse(row);
    if (!r.success) {
      errors.push({ kind: "writing", index, message: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") });
      return [];
    }
    return [{ ...r.data, imageUrl: r.data.imageUrl || null, visual: r.data.visual ?? undefined }];
  });
  const speaking = body.speaking.flatMap((row, index) => {
    const r = SpeakingTopicInput.safeParse(row);
    if (!r.success) {
      errors.push({ kind: "speaking", index, message: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") });
      return [];
    }
    return [r.data];
  });
  if (writing.length) await prisma.writingQuestion.createMany({ data: writing });
  if (speaking.length) await prisma.speakingTopic.createMany({ data: speaking });
  return json({ imported: { writing: writing.length, speaking: speaking.length }, errors });
});
