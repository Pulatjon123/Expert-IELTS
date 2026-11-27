import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { handler, json } from "@/lib/api";
import { startInterview } from "@/lib/interview-service";

/** Start a new AI examiner interview. Unlimited for every student (subject only to the shared fair-use limit on AI calls). */
export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const { format } = z.object({ format: z.enum(["full", "part1", "part23"]) }).parse(await req.json());
  return json({ sessionId: await startInterview(user.id, format) }, { status: 201 });
});
