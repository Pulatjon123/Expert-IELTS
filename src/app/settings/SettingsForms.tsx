"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Card, Input, Label, Select, cn } from "@/components/ui";
import { api } from "@/lib/fetcher";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const BANDS = [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9];

interface U {
  name: string;
  targetBand: number | null;
  examDate: string;
  locale: "en" | "uz";
  reminderEnabled: boolean;
  reminderDays: number[];
  role: string;
}

function useMsg() {
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  return { msg, ok: (text: string) => setMsg({ tone: "success", text }), fail: (e: unknown) => setMsg({ tone: "danger", text: (e as Error).message }) };
}

export function SettingsForms({ user }: { user: U }) {
  const router = useRouter();
  const [v, setV] = useState(user);
  const profile = useMsg();
  const pw = useMsg();
  const del = useMsg();
  const [pwd, setPwd] = useState({ current: "", next: "" });
  const [delPwd, setDelPwd] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function run(key: string, fn: () => Promise<void>, m: ReturnType<typeof useMsg>) {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      m.fail(e);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4 p-5">
        <h2 className="font-semibold">Profile and study plan</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="lang">Interface language</Label>
            <Select id="lang" value={v.locale} onChange={(e) => setV({ ...v, locale: e.target.value as "en" | "uz" })}>
              <option value="en">English</option>
              <option value="uz">O‘zbekcha</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="target">Target band</Label>
            <Select id="target" value={v.targetBand ?? ""} onChange={(e) => setV({ ...v, targetBand: e.target.value ? Number(e.target.value) : null })}>
              <option value="">Not set</option>
              {BANDS.map((b) => (
                <option key={b} value={b}>{b.toFixed(1)}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="exam">Exam date</Label>
            <Input id="exam" type="date" value={v.examDate} onChange={(e) => setV({ ...v, examDate: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={v.reminderEnabled} onChange={(e) => setV({ ...v, reminderEnabled: e.target.checked })} />
            Practice reminders
          </label>
          <p className="mt-1 text-xs text-muted">On the days you choose, the site shows a reminder when you visit if you haven&apos;t practised yet that day.</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {DAYS.map((d, i) => {
              const on = v.reminderDays.includes(i);
              return (
                <button
                  key={d}
                  type="button"
                  disabled={!v.reminderEnabled}
                  onClick={() => setV({ ...v, reminderDays: on ? v.reminderDays.filter((x) => x !== i) : [...v.reminderDays, i] })}
                  className={cn("rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40", on ? "border-primary bg-primary-soft text-primary" : "border-border")}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
        {profile.msg && <Alert tone={profile.msg.tone}>{profile.msg.text}</Alert>}
        <Button
          loading={busy === "profile"}
          onClick={() =>
            run(
              "profile",
              async () => {
                await api("/api/me", {
                  method: "PATCH",
                  json: { name: v.name, locale: v.locale, targetBand: v.targetBand, examDate: v.examDate || null, reminderEnabled: v.reminderEnabled, reminderDays: v.reminderDays },
                });
                document.cookie = `ei_locale=${v.locale}; path=/; max-age=31536000; samesite=lax`;
                profile.ok("Saved.");
                router.refresh();
              },
              profile,
            )
          }
        >
          Save changes
        </Button>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="font-semibold">Change password</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="cur">Current password</Label>
            <Input id="cur" type="password" autoComplete="current-password" value={pwd.current} onChange={(e) => setPwd({ ...pwd, current: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="new" hint="at least 8 characters">New password</Label>
            <Input id="new" type="password" autoComplete="new-password" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} />
          </div>
        </div>
        {pw.msg && <Alert tone={pw.msg.tone}>{pw.msg.text}</Alert>}
        <Button
          variant="secondary"
          loading={busy === "pw"}
          disabled={!pwd.current || pwd.next.length < 8}
          onClick={() =>
            run(
              "pw",
              async () => {
                await api("/api/me/password", { method: "POST", json: pwd });
                setPwd({ current: "", next: "" });
                pw.ok("Password changed. Other devices have been signed out.");
              },
              pw,
            )
          }
        >
          Update password
        </Button>
      </Card>

      {user.role !== "ADMIN" && (
        <Card className="space-y-3 border-danger/40 p-5">
          <h2 className="font-semibold text-danger">Delete account</h2>
          <p className="text-sm text-muted">Permanently deletes your account, essays, recordings, transcripts, vocabulary and reports. This cannot be undone.</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input type="password" placeholder="Your password" value={delPwd} onChange={(e) => setDelPwd(e.target.value)} className="sm:max-w-xs" autoComplete="current-password" />
            <Button
              variant="danger"
              loading={busy === "del"}
              disabled={!delPwd}
              onClick={() => {
                if (!confirm("Delete your account and all of your data permanently?")) return;
                run(
                  "del",
                  async () => {
                    await api("/api/me", { method: "DELETE", json: { password: delPwd } });
                    router.push("/");
                    router.refresh();
                  },
                  del,
                );
              }}
            >
              Delete my account
            </Button>
          </div>
          {del.msg && <Alert tone={del.msg.tone}>{del.msg.text}</Alert>}
        </Card>
      )}
    </div>
  );
}
