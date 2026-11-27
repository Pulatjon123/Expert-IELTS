"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Card, Input, Label } from "@/components/ui";
import { useI18n } from "@/lib/i18n/client";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const res = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const body = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(body.issues ? "Please check the form fields." : body.error ?? "Something went wrong.");
      return;
    }
    const next = params.get("next");
    router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : body.role === "ADMIN" ? "/admin" : "/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card className="p-8">
        <h1 className="font-display text-2xl font-semibold">{t(mode === "login" ? "auth.login.title" : "auth.register.title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("common.free")}</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {mode === "register" && (
            <div>
              <Label htmlFor="name">{t("auth.name")}</Label>
              <Input id="name" name="name" required minLength={2} maxLength={80} autoComplete="name" />
            </div>
          )}
          <div>
            <Label htmlFor="email">{t("auth.email")}</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div>
            <Label htmlFor="password" hint={mode === "register" ? t("auth.passwordHint") : undefined}>{t("auth.password")}</Label>
            <Input id="password" name="password" type="password" required minLength={mode === "register" ? 8 : 1} autoComplete={mode === "register" ? "new-password" : "current-password"} />
          </div>
          {error && <Alert tone="danger">{error}</Alert>}
          <Button type="submit" className="w-full" size="lg" loading={loading}>
            {t(mode === "login" ? "auth.submitLogin" : "auth.submitRegister")}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          {mode === "login" ? t("auth.noAccount") : t("auth.haveAccount")}{" "}
          <Link href={mode === "login" ? "/register" : "/login"} className="font-medium text-primary hover:underline">
            {mode === "login" ? t("nav.register") : t("nav.login")}
          </Link>
        </p>
      </Card>
    </div>
  );
}
