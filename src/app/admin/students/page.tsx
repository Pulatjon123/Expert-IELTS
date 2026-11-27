import Link from "next/link";
import { prisma } from "@/lib/db";
import { Badge, Card, PageHeader } from "@/components/ui";
import { StudentActions } from "./StudentActions";

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const users = await prisma.user.findMany({
    where: q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      lastActiveAt: true,
      _count: { select: { writingAttempts: true, speakingSessions: true } },
    },
  });
  return (
    <div>
      <PageHeader title="Students" subtitle={`${users.length} account${users.length === 1 ? "" : "s"} shown. Every student has full, free access.`}>
        <form className="flex gap-2">
          <input name="q" defaultValue={q} placeholder="Search name or email" className="h-10 rounded-lg border border-border bg-surface px-3 text-sm" />
        </form>
      </PageHeader>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Writing</th>
              <th className="px-4 py-3">Speaking</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Last active</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/admin/students/${u.id}`} className="font-medium hover:text-primary">{u.name}</Link>
                  <p className="text-xs text-muted">{u.email}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={u.role === "ADMIN" ? "accent" : "neutral"}>{u.role}</Badge>{" "}
                  {u.status === "SUSPENDED" && <Badge tone="danger">Suspended</Badge>}
                </td>
                <td className="px-4 py-3 tabular-nums">{u._count.writingAttempts}</td>
                <td className="px-4 py-3 tabular-nums">{u._count.speakingSessions}</td>
                <td className="px-4 py-3 text-muted">{u.createdAt.toLocaleDateString("en-GB")}</td>
                <td className="px-4 py-3 text-muted">{u.lastActiveAt.toLocaleDateString("en-GB")}</td>
                <td className="px-4 py-3">
                  <StudentActions id={u.id} status={u.status} role={u.role} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
