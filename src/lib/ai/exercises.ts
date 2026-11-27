import "server-only";
import { z } from "zod";
import { generateStructured } from "./claude";

export const ExerciseSetSchema = z.object({
  intro: z.string(),
  rule: z.string(),
  exercises: z.array(
    z.object({
      type: z.enum(["choose", "fix", "fill", "rewrite"]),
      instruction: z.string(),
      prompt: z.string(),
      options: z.array(z.string()),
      answer: z.string(),
      explanation: z.string(),
    }),
  ),
});
export type ExerciseSet = z.infer<typeof ExerciseSetSchema>;

const SYSTEM = `You are an IELTS teacher writing a short, targeted practice set for ONE recurring weakness of a specific student.
- Start with a one-paragraph intro that explains the problem simply, and a concise rule/pattern to remember.
- Write 8 exercises, mixing types:
  * "choose": multiple choice — give 3–4 options; "answer" must be exactly one of the options.
  * "fix": a sentence containing the error; the student rewrites it correctly.
  * "fill": a sentence with a gap shown as ___; "options" may be empty.
  * "rewrite": rewrite a sentence to sound more natural/academic.
- At least 3 exercises must be based on the student's own mistakes (given below), adapted so they are not copied word for word.
- Use IELTS-relevant topics. Keep explanations short and clear (B1–B2 English). For non-"choose" types, leave options empty.`;

export async function generateExercises(args: { name: string; explanation: string; examples: { example: string; correction: string | null }[]; userId: string }) {
  const prompt = `Weakness: ${args.name}
What we know: ${args.explanation}

The student's own mistakes (from their essays and speaking transcripts):
${args.examples.map((e) => `- "${e.example}"${e.correction ? ` → better: "${e.correction}"` : ""}`).join("\n") || "(no examples stored)"}`;
  return generateStructured({ feature: "weakness_exercises", userId: args.userId, system: SYSTEM, prompt, schema: ExerciseSetSchema, tier: "fast", effort: "low", maxTokens: 8000 });
}
