import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { prisma } from "../db";
import { AiLimitError, AiNotConfiguredError, AiOutputError } from "./errors";
import { getAiSettings, type AiFeature } from "./settings";

let client: Anthropic | null = null;

export function isClaudeConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

function getClient() {
  if (!isClaudeConfigured()) throw new AiNotConfiguredError("Claude AI (ANTHROPIC_API_KEY)");
  if (!client) client = new Anthropic();
  return client;
}

/** Make a JSON schema acceptable for structured outputs: closed objects, every key required, no unsupported keywords. */
function sanitizeSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(sanitizeSchema);
  if (!node || typeof node !== "object") return node;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (["$schema", "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "minLength", "maxLength", "pattern", "format", "minItems", "maxItems", "default"].includes(k)) continue;
    out[k] = sanitizeSchema(v);
  }
  if (out.type === "object" && out.properties && typeof out.properties === "object") {
    out.additionalProperties = false;
    out.required = Object.keys(out.properties as object);
  }
  return out;
}

export async function assertWithinLimit(userId: string | null) {
  if (!userId) return;
  const { dailyRequestsPerUser } = await getAiSettings();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const used = await prisma.aiUsageLog.count({ where: { userId, createdAt: { gte: since }, provider: "anthropic" } });
  if (used >= dailyRequestsPerUser) {
    throw new AiLimitError(
      `You've reached today's fair-use limit of ${dailyRequestsPerUser} AI requests (the same for every student, to keep the platform free). It resets within 24 hours.`,
    );
  }
}

export interface GenerateOptions<T extends z.ZodTypeAny> {
  feature: AiFeature;
  userId: string | null;
  system: string;
  prompt: string;
  schema: T;
  /** "primary" for assessment / long-form, "fast" for light tasks. */
  tier?: "primary" | "fast";
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
  /** Images the model should see (e.g. a Task 1 chart), sent before the text prompt. */
  images?: { mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif"; base64: string }[];
}

/**
 * Call Claude and get back JSON that is validated against `schema`.
 * Streams under the hood so long outputs (model essays, full assessments) don't hit HTTP timeouts.
 */
export async function generateStructured<T extends z.ZodTypeAny>(opts: GenerateOptions<T>): Promise<{ data: z.infer<T>; model: string }> {
  const anthropic = getClient();
  await assertWithinLimit(opts.userId);
  const settings = await getAiSettings();
  const model = opts.tier === "fast" ? settings.fastModel : settings.primaryModel;
  const extra = settings.instructions[opts.feature];
  const system = extra ? `${opts.system}\n\nAdditional instructions from the platform owner:\n${extra}` : opts.system;
  const jsonSchema = sanitizeSchema(z.toJSONSchema(opts.schema)) as Record<string, unknown>;

  const params: Record<string, unknown> = {
    model,
    max_tokens: opts.maxTokens ?? 32000,
    system,
    messages: [
      {
        role: "user",
        content: opts.images?.length
          ? [
              ...opts.images.map((img) => ({ type: "image", source: { type: "base64", media_type: img.mediaType, data: img.base64 } })),
              { type: "text", text: opts.prompt },
            ]
          : opts.prompt,
      },
    ],
    output_config: { effort: opts.effort ?? "medium", format: { type: "json_schema", schema: jsonSchema } },
  };
  if (settings.useFallbacks) {
    params.betas = ["server-side-fallback-2026-07-01"];
    params.fallbacks = "default";
  }

  let usage = { input: 0, output: 0, cached: 0 };
  let servedModel = model;
  try {
    const stream = anthropic.beta.messages.stream(params as unknown as Anthropic.Beta.Messages.MessageCreateParamsStreaming);
    const message = await stream.finalMessage();
    servedModel = message.model;
    usage = {
      input: message.usage.input_tokens,
      output: message.usage.output_tokens,
      cached: message.usage.cache_read_input_tokens ?? 0,
    };
    if (message.stop_reason === "refusal") throw new AiOutputError("The AI declined to answer this request.");
    if (message.stop_reason === "max_tokens") throw new AiOutputError("The AI response was cut off. Please try again.");
    const text = message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new AiOutputError("The AI returned malformed output. Please try again.");
    }
    const result = opts.schema.safeParse(parsed);
    if (!result.success) throw new AiOutputError("The AI output did not match the expected format. Please try again.");
    await logUsage(opts, servedModel, usage, true);
    return { data: result.data, model: servedModel };
  } catch (err) {
    await logUsage(opts, servedModel, usage, false, err instanceof Error ? err.message : String(err));
    if (err instanceof Anthropic.AuthenticationError) throw new AiNotConfiguredError("Claude AI", "The configured Anthropic API key was rejected.");
    if (err instanceof Anthropic.RateLimitError) throw new AiLimitError("The AI service is busy right now. Please try again in a minute.");
    throw err;
  }
}

async function logUsage(
  opts: { feature: AiFeature; userId: string | null },
  model: string,
  usage: { input: number; output: number; cached: number },
  success: boolean,
  error?: string,
) {
  await prisma.aiUsageLog
    .create({
      data: {
        userId: opts.userId,
        feature: opts.feature,
        provider: "anthropic",
        model,
        inputTokens: usage.input,
        outputTokens: usage.output,
        cachedTokens: usage.cached,
        success,
        error: error?.slice(0, 500),
      },
    })
    .catch(() => {});
}
