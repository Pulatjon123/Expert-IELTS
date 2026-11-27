import { prisma } from "@/lib/db";
import { Megaphone } from "lucide-react";

export async function Announcements() {
  const items = await prisma.announcement
    .findMany({ where: { active: true }, orderBy: { createdAt: "desc" }, take: 2 })
    .catch(() => []);
  if (!items.length) return null;
  return (
    <div className="border-b border-border bg-accent-soft">
      <div className="mx-auto max-w-6xl space-y-1 px-4 py-2 sm:px-6">
        {items.map((a) => (
          <p key={a.id} className="flex items-start gap-2 text-sm">
            <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <span>
              <span className="font-semibold">{a.title}</span> — {a.body}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}
