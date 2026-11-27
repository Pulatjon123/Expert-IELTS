"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Badge, Button, Card, Input, Label, Textarea } from "@/components/ui";
import { api } from "@/lib/fetcher";
import type { HomepageContent } from "@/lib/site";

interface Ann {
  id: string;
  title: string;
  body: string;
  active: boolean;
}

export function SiteForm({ homepage, announcements }: { homepage: HomepageContent; announcements: Ann[] }) {
  const router = useRouter();
  const [home, setHome] = useState(homepage);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ann, setAnn] = useState({ title: "", body: "" });

  async function run(fn: () => Promise<unknown>, ok?: string) {
    setErr(null);
    setMsg(null);
    try {
      await fn();
      if (ok) setMsg(ok);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4 p-5">
        <h2 className="font-semibold">Homepage text</h2>
        <p className="text-xs text-muted">Leave empty to use the default “Welcome to Expert IELTS” heading and subtitle.</p>
        {(["en", "uz"] as const).map((l) => (
          <div key={l} className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Heading ({l.toUpperCase()})</Label>
              <Input value={home[l]?.title ?? ""} onChange={(e) => setHome({ ...home, [l]: { ...home[l], title: e.target.value } })} />
            </div>
            <div>
              <Label>Subtitle ({l.toUpperCase()})</Label>
              <Input value={home[l]?.subtitle ?? ""} onChange={(e) => setHome({ ...home, [l]: { ...home[l], subtitle: e.target.value } })} />
            </div>
          </div>
        ))}
        <Button onClick={() => run(() => api("/api/admin/settings", { method: "PUT", json: { homepage: home } }), "Homepage saved.")}>Save homepage</Button>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="font-semibold">Announcements</h2>
        <div className="grid gap-3 md:grid-cols-[1fr_2fr_auto] md:items-end">
          <div>
            <Label>Title</Label>
            <Input value={ann.title} onChange={(e) => setAnn({ ...ann, title: e.target.value })} />
          </div>
          <div>
            <Label>Message</Label>
            <Textarea rows={1} value={ann.body} onChange={(e) => setAnn({ ...ann, body: e.target.value })} />
          </div>
          <Button
            disabled={!ann.title.trim() || !ann.body.trim()}
            onClick={() => run(async () => { await api("/api/admin/announcements", { method: "POST", json: ann }); setAnn({ title: "", body: "" }); }, "Announcement published.")}
          >
            Publish
          </Button>
        </div>
        <ul className="divide-y divide-border">
          {announcements.map((a) => (
            <li key={a.id} className="flex items-center gap-3 py-3 text-sm">
              <Badge tone={a.active ? "success" : "neutral"}>{a.active ? "Live" : "Hidden"}</Badge>
              <span className="min-w-0 flex-1"><span className="font-medium">{a.title}</span> — {a.body}</span>
              <Button size="sm" variant="secondary" onClick={() => run(() => api(`/api/admin/announcements/${a.id}`, { method: "PATCH", json: { active: !a.active } }))}>
                {a.active ? "Hide" : "Show"}
              </Button>
              <Button size="sm" variant="ghost" className="text-danger" onClick={() => confirm("Delete this announcement?") && run(() => api(`/api/admin/announcements/${a.id}`, { method: "DELETE" }))}>
                Delete
              </Button>
            </li>
          ))}
          {!announcements.length && <li className="py-3 text-sm text-muted">No announcements.</li>}
        </ul>
      </Card>
      {msg && <Alert tone="success">{msg}</Alert>}
      {err && <Alert tone="danger">{err}</Alert>}
    </div>
  );
}
