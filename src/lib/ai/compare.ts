import "server-only";
import { z } from "zod";
import { generateStructured } from "./claude";

export const ComparisonSchema = z.object({
  answers: z.array(z.object({ band: z.number().int(), text: z.string(), verdict: z.string() })),
  highlights: z.array(
    z.object({
      band: z.number().int(),
      text: z.string(),
      kind: z.enum(["feature", "limit"]),
      note: z.string(),
    }),
  ),
  dimensions: z.array(z.object({ name: z.string(), band6: z.string(), band7: z.string(), band8: z.string() })),
  why6Limited: z.array(z.string()),
  why7Stronger: z.array(z.string()),
  why8Sophisticated: z.array(z.string()),
});
export type Comparison = z.infer<typeof ComparisonSchema>;

const SYSTEM = `You are an IELTS examiner trainer. Write three illustrative answers to the SAME question, at Band 6, Band 7 and Band 8, so a learner can see exactly what changes between levels.
- Each answer must genuinely match its band under the public IELTS band descriptors — the Band 6 answer should contain the kind of limitations and errors a real Band 6 candidate makes (some imprecise vocabulary, mechanical linking, a few grammar slips, less developed ideas), not be a weak caricature. Band 7 is clearly better but not flawless. Band 8 is sophisticated, natural and precise without sounding memorised or forced.
- Keep the same general position/content across the three so differences are about language and development, not opinions.
- answers: exactly three, in order band 6, 7, 8, each with a one-sentence verdict.
- highlights: 4–8 per answer. "text" MUST be copied exactly from that answer. kind "limit" marks what holds the answer back; kind "feature" marks what makes it stronger. Each with a short note.
- dimensions: compare the three answers on each listed dimension in one sentence per band.
- why6Limited / why7Stronger / why8Sophisticated: 3–5 concise points each.
These are AI-generated learning examples, not official IELTS scripts.`;

export async function generateComparison(args: {
  skill: "WRITING" | "SPEAKING";
  question: string;
  detail: string;
  userId: string;
  images?: { mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif"; base64: string }[];
}) {
  const dims =
    args.skill === "WRITING"
      ? "Essay structure; Idea development; Vocabulary; Collocations; Grammar; Coherence and cohesion"
      : "Answer development; Fluency (as shown in the wording, fillers, self-correction); Vocabulary range; Natural expressions; Grammatical complexity";
  const prompt = `${args.skill === "WRITING" ? "IELTS Writing" : "IELTS Speaking (write the answers as natural spoken transcripts)"} — ${args.detail}

Question:
${args.question}

Dimensions to compare: ${dims}`;
  return generateStructured({ feature: "band_compare", userId: args.userId, system: SYSTEM, prompt, images: args.images, schema: ComparisonSchema, tier: "primary", effort: "medium" });
}
