import Link from "next/link";
import { Lock } from "lucide-react";

export function Footer({ freeLine }: { freeLine: string }) {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          <span className="font-display font-semibold text-text">EXPERT IELTS</span> · {freeLine}
        </p>
        <p className="max-w-md text-xs">
          All band scores on this site are AI estimates for practice and are not official IELTS results. IELTS is a registered trademark of its owners; this site is independent.
        </p>
      </div>
      {/* Owner-only admin entry point (bottom-right). The page behind it is protected server-side. */}
      <Link
        href="/admin"
        aria-label="Admin panel"
        title="Admin panel"
        className="fixed bottom-4 right-4 z-40 inline-flex h-10 items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-medium text-muted shadow-md transition hover:border-primary/40 hover:text-text"
      >
        <Lock className="h-4 w-4" />
        <span>Admin</span>
      </Link>
    </footer>
  );
}
