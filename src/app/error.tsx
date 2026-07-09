"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";

// Styled app-level error boundary (client component, per Next convention).
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="grid min-h-screen place-items-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-card border border-border/60 bg-surface p-8 text-center shadow-soft">
        <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-negative-soft text-negative">
          <TriangleAlert size={22} />
        </div>
        <h1 className="mt-4 text-base font-semibold text-ink">Une erreur est survenue</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Rien de grave — réessaie. Si ça persiste, recharge la page.
        </p>
        <button
          onClick={reset}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          <RefreshCw size={15} /> Réessayer
        </button>
      </div>
    </div>
  );
}
