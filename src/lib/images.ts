import "server-only";
import { randomUUID } from "node:crypto";
import { readStoredFile, saveFile } from "./storage";

/** Question images (Task 1 charts, maps, diagrams) uploaded by the owner, stored next to the audio files. */

// Below Vercel's 4.5 MB request limit.
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const IMAGE_URL_PREFIX = "/api/images/";

const TYPES = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
} as const;
type Ext = keyof typeof TYPES;
export type ImageMediaType = (typeof TYPES)[Ext];

const NAME_RE = /^[a-f0-9]{32}\.(png|jpg|webp|gif)$/;

/** Detect the real type from the file's first bytes (never trust the browser's MIME type). SVG is not accepted. */
export function detectImageExt(buf: Buffer): Ext | null {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  if (buf.length >= 6 && (buf.toString("ascii", 0, 6) === "GIF87a" || buf.toString("ascii", 0, 6) === "GIF89a")) return "gif";
  return null;
}

export async function saveQuestionImage(buf: Buffer, ext: Ext) {
  const name = `${randomUUID().replace(/-/g, "")}.${ext}`;
  await saveFile(`images/${name}`, buf, TYPES[ext]);
  return `${IMAGE_URL_PREFIX}${name}`;
}

export function isQuestionImageName(name: string) {
  return NAME_RE.test(name);
}

/** Returns the stored image for a valid file name, or null. */
export async function readQuestionImage(name: string): Promise<{ data: Buffer; mediaType: ImageMediaType } | null> {
  const m = name.match(NAME_RE);
  if (!m) return null;
  try {
    return { data: await readStoredFile(`images/${name}`), mediaType: TYPES[m[1] as Ext] };
  } catch {
    return null;
  }
}

/** The image of a question in the form Claude accepts, if it is one of our uploaded images. */
export async function imageForAi(imageUrl: string | null | undefined): Promise<{ mediaType: ImageMediaType; base64: string } | null> {
  if (!imageUrl?.startsWith(IMAGE_URL_PREFIX)) return null;
  const img = await readQuestionImage(imageUrl.slice(IMAGE_URL_PREFIX.length));
  return img ? { mediaType: img.mediaType, base64: img.data.toString("base64") } : null;
}
