import { z } from "zod";

const source = z.enum(["VERIFIED_REPORT", "AI_GENERATED", "PRACTICE"]);

function requireNoteForVerified<T extends { source?: string; sourceNote?: string | null }>(v: T, ctx: z.RefinementCtx) {
  if (v.source === "VERIFIED_REPORT" && !v.sourceNote?.trim()) {
    ctx.addIssue({ code: "custom", path: ["sourceNote"], message: "A verified report needs a source note (where/when it was reported)." });
  }
}

export const WritingQuestionInput = z
  .object({
    task: z.enum(["TASK1", "TASK2"]),
    category: z.string().trim().min(2).max(40),
    topic: z.string().trim().min(2).max(80),
    prompt: z.string().trim().min(20).max(4000),
    visual: z.any().optional().nullable(),
    // A full https URL, or an image uploaded through the admin panel (/api/images/<file>).
    imageUrl: z
      .union([z.string().trim().url().max(1000), z.string().trim().regex(/^\/api\/images\/[a-f0-9]{32}\.(png|jpg|webp|gif)$/)])
      .optional()
      .nullable()
      .or(z.literal("")),
    source,
    sourceNote: z.string().trim().max(500).optional().nullable(),
    reportedAt: z.coerce.date().optional().nullable(),
    isActive: z.boolean().default(true),
  })
  .superRefine(requireNoteForVerified);

export const SpeakingTopicInput = z
  .object({
    part: z.coerce.number().int().min(1).max(3),
    topic: z.string().trim().min(2).max(80),
    title: z.string().trim().min(2).max(200),
    questions: z.array(z.string().trim().min(3).max(500)).max(20).default([]),
    cueCard: z.string().trim().max(500).optional().nullable(),
    bulletPoints: z.array(z.string().trim().min(1).max(300)).max(8).default([]),
    linkedTopicId: z.string().optional().nullable(),
    source,
    sourceNote: z.string().trim().max(500).optional().nullable(),
    reportedAt: z.coerce.date().optional().nullable(),
    isActive: z.boolean().default(true),
  })
  .superRefine(requireNoteForVerified)
  .superRefine((v, ctx) => {
    if (v.part === 2 && (!v.cueCard?.trim() || v.bulletPoints.length < 2))
      ctx.addIssue({ code: "custom", path: ["cueCard"], message: "A Part 2 cue card needs a main prompt and at least two bullet points." });
    if (v.part !== 2 && v.questions.length < 1)
      ctx.addIssue({ code: "custom", path: ["questions"], message: "Add at least one question." });
  });
