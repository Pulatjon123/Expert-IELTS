import { requireUser } from "@/lib/auth";
import { handler, json } from "@/lib/api";
import { submitAndAssess } from "@/lib/writing-service";

export const maxDuration = 300;

export const POST = handler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await params;
  return json(await submitAndAssess(id, user.id));
});
