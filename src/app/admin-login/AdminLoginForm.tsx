"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lock } from "lucide-react";
import { Alert, Button, Card, Input, Label } from "@/components/ui";

export function AdminLoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const res = await fetch("/api/auth/admin-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const body = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(body.error ?? "Something went wrong.");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card className="p-8">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-fg">
          <Lock className="h-5 w-5" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-semibold">Admin panel</h1>
        <p className="mt-1 text-sm text-muted">Faqat sayt muallifi uchun. / Owner only.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email">Login (email)</Label>
            <Input id="email" name="email" type="email" required autoComplete="username" />
          </div>
          <div>
            <Label htmlFor="password">Parol / Password</Label>
            <Input id="password" name="password" type="password" required autoComplete="current-password" />
          </div>
          {error && <Alert tone="danger">{error}</Alert>}
          <Button type="submit" className="w-full" size="lg" loading={loading}>
            Kirish / Sign in
          </Button>
        </form>
      </Card>
    </div>
  );
}
