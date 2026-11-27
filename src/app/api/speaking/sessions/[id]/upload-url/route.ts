import { requireUser } from "@/lib/auth";
import { handler, json } from "@/lib/api";
import { getOwnedSession, newDirectUploadKey } from "@/lib/speaking-service";
import { signedUploadUrl } from "@/lib/storage";

/**
 * Where the browser should upload a recording. With cloud storage (Vercel) it gets a one-time upload link, so large
 * recordings never pass through the 4.5 MB request limit. Without it, the browser posts the file to /recordings as before.
 */
export const POST = handler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await params;
  await getOwnedSession(id, user.id);
  const key = newDirectUploadKey(user.id);
  const uploadUrl = await signedUploadUrl(key);
  return json(uploadUrl ? { mode: "direct", key, uploadUrl } : { mode: "server" });
});
