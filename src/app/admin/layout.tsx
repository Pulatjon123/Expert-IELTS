import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { BarChart3, FileQuestion, Users, Cpu, Globe } from "lucide-react";

export const metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  // Anyone who is not signed in as the owner is sent to the separate owner sign-in page.
  if (!user || user.role !== "ADMIN") redirect("/admin-login");
  const nav = [
    { href: "/admin", label: "Analytics", icon: BarChart3 },
    { href: "/admin/questions", label: "Questions", icon: FileQuestion },
    { href: "/admin/students", label: "Students", icon: Users },
    { href: "/admin/ai", label: "AI management", icon: Cpu },
    { href: "/admin/site", label: "Website", icon: Globe },
  ];
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row">
      <aside className="lg:w-56 lg:shrink-0">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Owner panel</p>
        <nav className="flex gap-1 overflow-x-auto lg:flex-col">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface-2">
              <n.icon className="h-4 w-4 text-muted" /> {n.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
