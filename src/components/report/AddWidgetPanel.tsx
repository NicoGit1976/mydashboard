"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { addWidget } from "@/lib/widget-actions";
import { WIDGET_PALETTE } from "@/lib/metrics-catalog";

export default function AddWidgetPanel({
  reportId,
  clientId,
}: {
  reportId: string;
  clientId: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const add = (key: string) =>
    startTransition(async () => {
      await addWidget(reportId, clientId, key);
      setOpen(false);
    });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="col-span-12 flex w-full items-center justify-center gap-2 rounded-card border border-dashed border-border bg-surface px-4 py-3 text-sm font-medium text-ink-soft transition-colors hover:border-brand/40 hover:text-brand"
      >
        <Plus size={16} /> Ajouter un widget
      </button>
    );
  }

  return (
    <div className="col-span-12 rounded-card border border-border bg-surface p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Ajouter un widget</h3>
        <button
          onClick={() => setOpen(false)}
          className="text-muted transition-colors hover:text-ink"
        >
          <X size={16} />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {WIDGET_PALETTE.map((b) => (
          <button
            key={b.key}
            disabled={pending}
            onClick={() => add(b.key)}
            className="rounded-lg border border-border bg-white px-3 py-2.5 text-left text-xs font-medium text-ink-soft transition-colors hover:border-brand/40 hover:bg-bg disabled:opacity-50"
          >
            {b.label}
          </button>
        ))}
      </div>
    </div>
  );
}
