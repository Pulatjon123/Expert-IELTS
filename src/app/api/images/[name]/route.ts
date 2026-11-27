import { HttpError } from "@/lib/auth";
import { handler } from "@/lib/api";
import { isQuestionImageName, readQuestionImage } from "@/lib/images";
import { signedReadUrl } from "@/lib/storage";

/** Public question images (the file names are random, and they only appear on question pages). */
export const GET = handler(async (_req: Request, { params }: { params: Promise<{ name: string }> }) => {
  const { name } = await params;
  if (!isQuestionImageName(name)) throw new HttpError(404, "Image not found.");

  // Cloud storage: redirect to a signed link (valid 1 day; the redirect itself is cached for 1 hour).
  const signed = await signedReadUrl(`images/${name}`, 86400).catch(() => null);
  if (signed) return new Response(null, { status: 302, headers: { Location: signed, "Cache-Control": "public, max-age=3600" } });

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
