import "server-only";
export { isClaudeConfigured } from "./claude";

export function isSttConfigured() {
  return Boolean(process.env.STT_API_URL && process.env.STT_API_KEY);
}

export function isPronunciationConfigured() {
  return Boolean(process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION);
}
