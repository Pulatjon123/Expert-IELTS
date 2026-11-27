import "server-only";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";

/**
 * File storage for audio recordings and question images.
 *
 * - Supabase Storage when SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set (needed on Vercel, whose disk is temporary).
 * - Otherwise the local disk under UPLOAD_DIR (development, or a server with a persistent volume).
 *
 * Paths are always built from database ids / random names, never from user input.
 */

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/+$/, "");
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_BUCKET || "expert-ielts";

export const usesCloudStorage = Boolean(SUPABASE_URL && SUPABASE_KEY);

const KEY_RE = /^[A-Za-z0-9_\-/.]+$/;
function checkKey(rel: string) {
  if (!KEY_RE.test(rel) || rel.includes("..") || rel.startsWith("/")) throw new Error("Invalid storage path");
  return rel;
}

// ───────────────────────────── Local disk ─────────────────────────────

const ROOT = path.resolve(process.env.UPLOAD_DIR || "./storage");

function safe(rel: string) {
  const full = path.resolve(ROOT, checkKey(rel));
  if (!full.startsWith(ROOT + path.sep)) throw new Error("Invalid storage path");
  return full;
}

// ───────────────────────────── Supabase Storage (REST) ─────────────────────────────

function sbHeaders(extra: Record<string, string> = {}) {
  return { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY as string, ...extra };
}

function sbObjectUrl(kind: "object" | "object/sign" | "object/upload/sign", rel: string) {
  const encoded = checkKey(rel).split("/").map(encodeURIComponent).join("/");
  return `${SUPABASE_URL}/storage/v1/${kind}/${BUCKET}/${encoded}`;
}

async function sbFail(res: Response, what: string): Promise<never> {
  const body = await res.text().catch(() => "");
  throw new Error(`Storage ${what} failed (${res.status}): ${body.slice(0, 200)}`);
}

// ───────────────────────────── Public API ─────────────────────────────

export async function saveFile(rel: string, data: Buffer, contentType = "application/octet-stream") {
  if (usesCloudStorage) {
    const res = await fetch(sbObjectUrl("object", rel), {
      method: "POST",
      headers: sbHeaders({ "Content-Type": contentType, "x-upsert": "true" }),
      body: new Uint8Array(data),
    });
    if (!res.ok) await sbFail(res, "upload");
    return;
  }
  const full = safe(rel);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
}

export async function readStoredFile(rel: string): Promise<Buffer> {
  if (usesCloudStorage) {
    const res = await fetch(sbObjectUrl("object", rel), { headers: sbHeaders(), cache: "no-store" });
    if (!res.ok) await sbFail(res, "download");
    return Buffer.from(await res.arrayBuffer());
  }
  return readFile(safe(rel));
}

export async function deleteFile(rel: string) {
  if (usesCloudStorage) {
    const res = await fetch(sbObjectUrl("object", rel), { method: "DELETE", headers: sbHeaders() });
    if (!res.ok && res.status !== 404 && res.status !== 400) await sbFail(res, "delete");
    return;
  }
  await rm(safe(rel), { force: true });
}

/** A short-lived link the browser can read the file from directly (cloud storage only; null on local disk). */
export async function signedReadUrl(rel: string, expiresInSec = 3600): Promise<string | null> {
  if (!usesCloudStorage) return null;
  const res = await fetch(sbObjectUrl("object/sign", rel), {
    method: "POST",
    headers: sbHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ expiresIn: expiresInSec }),
  });
  if (!res.ok) await sbFail(res, "sign");
  const { signedURL } = (await res.json()) as { signedURL: string };
  return `${SUPABASE_URL}/storage/v1${signedURL}`;
}

/** A one-time link the browser can upload a file to directly (cloud storage only; null on local disk). */
export async function signedUploadUrl(rel: string): Promise<string | null> {
  if (!usesCloudStorage) return null;
  const res = await fetch(sbObjectUrl("object/upload/sign", rel), { method: "POST", headers: sbHeaders() });
  if (!res.ok) await sbFail(res, "upload sign");
  const { url } = (await res.json()) as { url: string };
  return `${SUPABASE_URL}/storage/v1${url}`;
}

// Local-disk only (used for audio streaming with Range support when cloud storage is off).
export async function fileSize(rel: string) {
  return (await stat(safe(rel))).size;
}

export function streamFile(rel: string, range?: { start: number; end: number }) {
  return createReadStream(safe(rel), range);
}
