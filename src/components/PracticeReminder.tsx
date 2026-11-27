import Link from "next/link";
import { BellRing } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/** In-app practice reminder: shown on the student's chosen days until they practise that day. */
export async function PracticeReminder() {
  const user = await getCurrentUser().catch(() => null);
  if (!user?.reminderEnabled || !user.reminderDays.length) return null;
  const now = new Date();
  const weekday = (now.getDay() + 6) % 7; // 0 = Monday
  if (!user.reminderDays.includes(weekday)) return null;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const [w, s] = await Promise.all([
    prisma.writingAttempt.count({ where: { userId: user.id, updatedAt: { gte: today } } }),
    prisma.speakingSession.count({ where: { userId: user.id, updatedAt: { gte: today } } }),
  ]);
  if (w + s > 0) return null;
  return (
    <div className="border-b border-border bg-primary-soft">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm sm:px-6">
        <BellRing className="h-4 w-4 text-primary" />
        <span>Today is one of your practice days.</span>
        <Link href="/writing" className="font-medium text-primary hover:underline">Write an essay</Link>
        <span className="text-muted">or</span>
        <Link href="/speaking" className="font-medium text-primary hover:underline">record a speaking answer</Link>
        <Link href="/settings" className="ml-auto text-xs text-muted hover:text-text">Reminder settings</Link>
      </div>
    </div>
  );
}
