import "server-only";
import { prisma } from "./db";

export interface HomepageContent {
  en: { title?: string; subtitle?: string };
  uz: { title?: string; subtitle?: string };
}

export async function getHomepageContent(): Promise<HomepageContent> {
  const row = await prisma.setting.findUnique({ where: { key: "homepage" } }).catch(() => null);
  return { en: {}, uz: {}, ...((row?.value as Partial<HomepageContent>) ?? {}) };
}
