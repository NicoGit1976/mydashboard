"use client";

import { Download } from "lucide-react";

// Client-side print trigger for the public share page (PDF via the browser).
export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
    >
      <Download size={16} /> Exporter en PDF
    </button>
  );
}
