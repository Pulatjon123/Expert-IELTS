"use client";
import { useRouter } from "next/navigation";
import { Moon, Sun, Languages, LogOut } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";

export function ThemeToggle() {
  const toggle = () => {
    const dark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("ei_theme", dark ? "dark" : "light");
    } catch {}
  };
  return (
    <button
      onClick={toggle}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-text"
      aria-label="Toggle dark mode"
      title="Light / dark"
    >
      <Sun className="hidden h-4 w-4 dark:block" />
      <Moon className="h-4 w-4 dark:hidden" />
    </button>
  );
}

export function LocaleSwitcher() {
  const { locale } = useI18n();
  const router = useRouter();
  const next = locale === "en" ? "uz" : "en";
  return (
    <button
      onClick={async () => {
        document.cookie = `ei_locale=${next}; path=/; max-age=31536000; samesite=lax`;
        await fetch("/api/me/locale", { method: "POST", body: JSON.stringify({ locale: next }) }).catch(() => {});
        router.refresh();
      }}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm text-muted hover:bg-surface-2 hover:text-text"
      aria-label="Change language"
      title={next === "uz" ? "O‘zbekcha" : "English"}
    >
      <Languages className="h-4 w-4" />
      <span className="font-medium uppercase">{locale}</span>
    </button>
  );
}

export function LogoutButton({ label }: { label: string }) {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/");
        router.refresh();
      }}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm text-muted hover:bg-surface-2 hover:text-text"
    >
      <LogOut className="h-4 w-4" />
      <span className="hidden whitespace-nowrap sm:inline">{label}</span>
    </button>
  );
}
