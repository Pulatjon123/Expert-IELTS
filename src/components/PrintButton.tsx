"use client";
import { Download } from "lucide-react";
import { Button } from "./ui";

/** Opens the browser's print dialog, where students can choose "Save as PDF". */
export function PrintButton({ label = "Download PDF" }: { label?: string }) {
  return (
    <Button variant="secondary" className="print:hidden" onClick={() => window.print()} title="Choose “Save as PDF” in the print dialog">
      <Download className="h-4 w-4" /> {label}
    </Button>
  );
}
