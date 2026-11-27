import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { LocaleSwitcher, LogoutButton, ThemeToggle } from "./Controls";
import { MobileNav } from "./MobileNav";

export async function Header() {
  const [user, { t }] = await Promise.all([getCurrentUser(), getT()]);
  const links = [
    { href: "/writing", label: t("nav.writing") },
    { href: "/speaking", label: t("nav.speaking") },
    ...(user
      ? [
          { href: "/dashboard", label: t("nav.dashboard") },
          { href: "/vocabulary", label: t("nav.vocabulary") },
          { href: "/weaknesses", label: t("nav.weaknesses") },
          { href: "/reports", label: t("nav.reports") },
        ]
      : []),
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2" aria-label="Expert IELTS home">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary font-display text-sm font-bold text-primary-fg">E</span>
          <span className="whitespace-nowrap font-display text-lg font-semibold tracking-tight">
            EXPERT <span className="text-accent">IELTS</span>
          </span>
        </Link>
        <nav className="ml-4 hidden items-center gap-1 xl:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-text">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <LocaleSwitcher />
          <ThemeToggle />
          {user ? (
            <>
              <Link href="/settings" className="hidden rounded-lg px-2 py-2 text-sm text-muted hover:bg-surface-2 hover:text-text sm:block">
                {user.name.split(" ")[0]}
              </Link>
              <LogoutButton label={t("nav.logout")} />
            </>
          ) : (
            <>
              <Link href="/login" className="hidden rounded-lg px-3 py-2 text-sm font-medium hover:bg-surface-2 sm:block">
                {t("nav.login")}
              </Link>
              <Link href="/register" className="hidden rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-fg hover:bg-primary-hover sm:block">
                {t("nav.register")}
              </Link>
            </>
          )}
          <MobileNav links={[...links, ...(user ? [{ href: "/settings", label: t("nav.settings") }] : [{ href: "/login", label: t("nav.login") }, { href: "/register", label: t("nav.register") }])]} />
        </div>
      </div>
    </header>
  );
}
