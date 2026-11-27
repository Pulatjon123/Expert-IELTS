import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import { Goals } from "@/components/Goals";
import { SettingsForms } from "./SettingsForms";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/settings");
  const goals = await prisma.learningGoal.findMany({ where: { userId: user.id }, orderBy: [{ done: "asc" }, { createdAt: "desc" }] });
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <PageHeader title="Settings" subtitle={user.email} />
      <SettingsForms
        user={{
          name: user.name,
          targetBand: user.targetBand,
          examDate: user.examDate?.toISOString().slice(0, 10) ?? "",
          locale: user.locale as "en" | "uz",
          reminderEnabled: user.reminderEnabled,
          reminderDays: user.reminderDays,
          role: user.role,
        }}
      />
      <Card className="mt-6 p-5">
        <h2 className="font-semibold">Personal learning goals</h2>
        <div className="mt-3">
          <Goals initial={goals.map((g) => ({ id: g.id, title: g.title, done: g.done, targetDate: g.targetDate?.toISOString() ?? null }))} />
        </div>
      </Card>
    </div>
  );
}
