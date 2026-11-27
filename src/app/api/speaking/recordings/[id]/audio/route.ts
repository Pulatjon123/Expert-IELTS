import { Readable } from "node:stream";
import { prisma } from "@/lib/db";
import { requireUser, HttpError } from "@/lib/auth";
import { handler } from "@/lib/api";
import { fileSize, signedReadUrl, streamFile } from "@/lib/storage";

/** Stream a recording to its owner (or an admin). Supports Range requests so the player can seek. */
export const GET = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await params;
  const rec = await prisma.speakingRecording.findFirst({
    where: { id, ...(user.role === "ADMIN" ? {} : { session: { userId: user.id } }) },
    select: { audioPath: true, mimeType: true },
  });
  if (!rec) throw new HttpError(404, "Recording not found.");
  // Cloud storage: send the player to a short-lived private link (supports seeking, and avoids the 4.5 MB response limit).
  const signed = await signedReadUrl(rec.audioPath, 3600);
  if (signed) return new Response(null, { status: 302, headers: { Location: signed, "Cache-Control": "private, no-store" } });
  const size = await fileSize(rec.audioPath);
  const headers: Record<string, string> = {
    "Content-Type": rec.mimeType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
  };
  const range = req.headers.get("range")?.match(/bytes=(\d*)-(\d*)/);
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    const body = Readable.toWeb(streamFile(rec.audioPath, { start, end })) as ReadableStream;
    return new Response(body, { status: 206, headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) } });
  }
  const body = Readable.toWeb(streamFile(rec.audioPath)) as ReadableStream;
  return new Response(body, { headers: { ...headers, "Content-Length": String(size) } });
});
