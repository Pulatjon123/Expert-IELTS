"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** First-party, cookie-free page view counter for the owner's analytics. */
export function PageViewTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    const body = JSON.stringify({ path: pathname });
    if (!navigator.sendBeacon?.("/api/pv", body)) fetch("/api/pv", { method: "POST", body, keepalive: true }).catch(() => {});
  }, [pathname]);
  return null;
}
