"use client";

import type { ReactNode } from "react";
import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Settings2, Trash2 } from "lucide-react";
import { deleteWidget, moveWidget, setWidgetSpan } from "@/lib/widget-actions";
import WidgetConfigModal, { type WidgetData } from "@/components/report/WidgetConfigModal";

const SPANS = [
  { v: 3, l: "¼" },
  { v: 4, l: "⅓" },
  { v: 6, l: "½" },
  { v: 8, l: "⅔" },
  { v: 12, l: "1/1" },
];

export default function WidgetFrame({
  widget,
  clientId,
  isFirst,
  isLast,
  editMode,
  children,
}: {
  widget: WidgetData;
  clientId: string;
  isFirst: boolean;
  isLast: boolean;
  editMode: boolean;
  children: ReactNode;
}) {
  const [pending, startTransition] = useTransition();
  const [configuring, setConfiguring] = useState(false);

  if (!editMode) return <>{children}</>;

  const run = (fn: () => Promise<unknown>) =>
    startTransition(async () => {
      await fn();
    });

  return (
    <div className="relative h-full rounded-[18px] ring-1 ring-brand/20">
      <div className="absolute right-2 top-2 z-20 flex items-center gap-1 rounded-lg border border-border bg-white/95 p-1 shadow-soft backdrop-blur">
        <button
          title="Monter"
          disabled={isFirst || pending}
          onClick={() => run(() => moveWidget(widget.id, clientId, "up"))}
          className="grid h-7 w-7 place-items-center rounded text-ink-soft transition-colors hover:bg-bg disabled:opacity-30"
        >
          <ArrowUp size={15} />
        </button>
        <button
          title="Descendre"
          disabled={isLast || pending}
          onClick={() => run(() => moveWidget(widget.id, clientId, "down"))}
          className="grid h-7 w-7 place-items-center rounded text-ink-soft transition-colors hover:bg-bg disabled:opacity-30"
        >
          <ArrowDown size={15} />
        </button>
        <select
          title="Largeur"
          value={widget.span}
          disabled={pending}
          onChange={(e) => run(() => setWidgetSpan(widget.id, clientId, Number(e.target.value)))}
          className="h-7 rounded border border-border bg-white px-1 text-xs text-ink-soft outline-none"
        >
          {SPANS.map((s) => (
            <option key={s.v} value={s.v}>
              {s.l}
            </option>
          ))}
        </select>
        <button
          title="Configurer"
          disabled={pending}
          onClick={() => setConfiguring(true)}
          className="grid h-7 w-7 place-items-center rounded text-ink-soft transition-colors hover:bg-bg disabled:opacity-30"
        >
          <Settings2 size={15} />
        </button>
        <button
          title="Supprimer"
          disabled={pending}
          onClick={() => run(() => deleteWidget(widget.id, clientId))}
          className="grid h-7 w-7 place-items-center rounded text-negative transition-colors hover:bg-negative-soft disabled:opacity-30"
        >
          <Trash2 size={15} />
        </button>
      </div>

      <div className={pending ? "pointer-events-none opacity-50 transition-opacity" : "transition-opacity"}>
        {children}
      </div>

      {configuring && (
        <WidgetConfigModal
          widget={widget}
          clientId={clientId}
          onClose={() => setConfiguring(false)}
        />
      )}
    </div>
  );
}
