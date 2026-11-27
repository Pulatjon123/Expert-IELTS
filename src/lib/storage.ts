import "server-only";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";

/** Local-disk storage for audio. Paths are always built from database ids, never from user input. */
const ROOT = path.resolve(process.env.UPLOAD_DIR || "./storage");

function safe(rel: string) {
  const full = path.resolve(ROOT, rel);
  if (!full.startsWith(ROOT + path.sep)) throw new Error("Invalid storage path");
  return full;
}

export async function saveFile(rel: string, data: Buffer) {
  const full = safe(rel);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
}

export async function readStoredFile(rel: string) {
  return readFile(safe(rel));
}

export async function fileSize(rel: string) {
  return (await stat(safe(rel))).size;
}

export function streamFile(rel: string, range?: { start: number; end: number }) {
  return createReadStream(safe(rel), range);
}

export async function deleteFile(rel: string) {
  await rm(safe(rel), { force: true });
}
