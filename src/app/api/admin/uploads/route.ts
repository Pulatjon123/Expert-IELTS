import { requireAdmin, HttpError } from "@/lib/auth";
import { handler, json } from "@/lib/api";
import { MAX_IMAGE_BYTES, detectImageExt, saveQuestionImage } from "@/lib/images";

/** Owner-only image upload for questions. Accepts PNG, JPEG, WebP or GIF up to 4 MB. */
export const POST = handler(async (req: Request) => {
  await requireAdmin();
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") throw new HttpError(400, "No file was uploaded.");
  if (file.size > MAX_IMAGE_BYTES) throw new HttpError(413, "The image is larger than 4 MB.");
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = detectImageExt(buf);
  if (!ext) throw new HttpError(415, "Only PNG, JPG, WebP or GIF images are allowed.");
  const url = await saveQuestionImage(buf, ext);
  return json({ url }, { status: 201 });
});
