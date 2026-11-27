"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";
import { api } from "@/lib/fetcher";

export function StudentActions({ id, status, role }: { id: string; status: string; role: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex justify-end gap-1">
      <Button
        size="sm"
        variant="secondary"
        disabled={busy}
        onClick={() => run(() => api(`/api/admin/students/${id}`, { method: "PATCH", json: { status: status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" } }))}
      >
        {status === "ACTIVE" ? "Suspend" : "Reactivate"}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={busy}
        onClick={() => {
          if (confirm(role === "ADMIN" ? "Remove admin rights from this account?" : "Give this account full admin rights?"))
            run(() => api(`/api/admin/students/${id}`, { method: "PATCH", json: { role: role === "ADMIN" ? "STUDENT" : "ADMIN" } }));
        }}
      >
        {role === "ADMIN" ? "Make student" : "Make admin"}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="text-danger"
        disabled={busy}
        onClick={() => {
          if (confirm("Permanently delete this account and all of its essays, recordings and progress? This cannot be undone."))
            run(() => api(`/api/admin/students/${id}`, { method: "DELETE" }));
        }}
      >
        Delete
      </Button>
    </div>
  );
}
