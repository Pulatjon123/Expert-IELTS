/** USD per million tokens (Anthropic first-party list prices). Used only for the owner's cost estimates. */
export const MODEL_PRICES: Record<string, { input: number; output: number; cacheRead: number }> = {
  "claude-fable-5-2": { input: 8, output: 40, cacheRead: 0.2 },
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.1 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01 },
};

export const MODEL_OPTIONS = [
  { id: "claude-opus-5-5", label: "Claude Opus 5.5 — default, best assessment quality ($4 / $20 per M tokens)" },
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5 — cheaper, strong ($2 / $10)" },
  { id: "claude-haiku-5-5", label: "Claude Haiku 5.5 — lowest cost ($0.10 / $0.50)" },
  { id: "claude-fable-5-2", label: "Claude Fable 5.2 — most capable, most expensive ($8 / $40)" },
];

export function estimateCost(model: string, input: number, output: number, cached = 0) {
  const p = MODEL_PRICES[model] ?? MODEL_PRICES["claude-opus-5-5"];
  return ((input - cached) * p.input + cached * p.cacheRead + output * p.output) / 1_000_000;
}
