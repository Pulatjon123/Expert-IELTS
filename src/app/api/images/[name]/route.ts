import { HttpError } from "@/lib/auth";
import { handler } from "@/lib/api";
import { readQuestionImage } from "@/lib/images";

/** Public question images (the file names are random, and they only appear on question pages). */
export const GET = handler(async (_req: Request, { params }: { params: Promise<{ name: string }> }) => {
  const { name } = await params;
  const img = await readQuestionImage(name);
  if (!img) throw new HttpError(404, "Image not found.");
  return new Response(new Uint8Array(img.data), {
    headers: {
      "Content-Type": img.mediaType,
      "Content-Length": String(img.data.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
