"use client";

import { useState, useTransition } from "react";
import { Copy, LayoutTemplate, Loader2, X } from "lucide-react";
import { applyTemplate, cloneReportLayout } from "@/lib/template-actions";

export type TemplateChoice = {
  key: string;
  label: string;
  description: string;
  /** Blocks this template would actually lay down for THIS client. */
  blocks: number;
};

// Replacing a layout throws away everything already on the report, so this
// panel never acts on the first click — it states what will be lost first.
export default function TemplatePanel({
  clientId,
  templates,
  otherClients,
}: {
  clientId: string;
  templates: TemplateChoice[];
  otherClients: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [cloneFrom, setCloneFrom] = useState("");
  const [confirmClone, setConfirmClone] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function reset() {
    setConfirming(null);
    setConfirmClone(false);
    setError("");
  }

  function onApply(key: string) {
    if (pending) return;
    setError("");
    startTransition(async () => {
      try {
        const res = await applyTemplate(clientId, key);
        if (res.ok) {
          setOpen(false);
          reset();
        } else setError(res.error ?? "Application impossible.");
      } catch {
        setError("Application impossible pour le moment — réessaie.");
      }
    });
  }

  function onClone() {
    if (pending || !cloneFrom) return;
    setError("");
    startTransition(async () => {
      try {
        const res = await cloneReportLayout(clientId, cloneFrom);
        if (res.ok) {
          setOpen(false);
          reset();
        } else setError(res.error ?? "Copie impossible.");
      } catch {
        setError("Copie impossible pour le moment — réessaie.");
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="col-span-12 flex w-full items-center justify-center gap-2 rounded-card border border-dashed border-border bg-surface px-4 py-3 text-sm font-medium text-ink-soft transition-colors hover:border-brand/40 hover:text-brand"
      >
        <LayoutTemplate size={16} /> Partir d&apos;un modèle
      </button>
    );
  }

  return (
    <div className="col-span-12 rounded-card border border-border bg-surface p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Partir d&apos;un modèle</h3>
        <button
          onClick={() => {
            setOpen(false);
            reset();
          }}
          className="text-muted transition-colors hover:text-ink"
          aria-label="Fermer"
        >
          <X size={16} />
        </button>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        Le modèle <strong>remplace</strong> la mise en page actuelle. Seuls les blocs
        qu&apos;une source branchée de ce client peut alimenter sont posés — pas de carte
        condamnée à rester en démo.
      </p>

      {error && (
        <p className="mt-3 rounded-lg bg-negative-soft px-3 py-2 text-xs font-medium text-negative">
          {error}
        </p>
      )}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {templates.map((t) => {
          const empty = t.key !== "blank" && t.blocks === 0;
          const isConfirming = confirming === t.key;
          return (
            <div
              key={t.key}
              className={`rounded-card border p-3 ${
                isConfirming ? "border-brand/50 bg-brand-soft/40" : "border-border bg-white"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold text-ink">{t.label}</span>
                <span className="shrink-0 text-[11px] text-muted">
                  {t.key === "blank"
                    ? "0 bloc"
                    : empty
                      ? "aucune source"
                      : `${t.blocks} bloc${t.blocks > 1 ? "s" : ""}`}
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-snug text-muted">{t.description}</p>

              {isConfirming ? (
                <div className="mt-2.5 flex items-center gap-2">
                  <button
                    onClick={() => onApply(t.key)}
                    disabled={pending}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-negative px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    {pending && <Loader2 size={12} className="animate-spin" />}
                    Remplacer la mise en page
                  </button>
                  <button
                    onClick={() => setConfirming(null)}
                    className="text-xs font-medium text-muted hover:text-ink"
                  >
                    Annuler
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setError("");
                    setConfirming(t.key);
                  }}
                  disabled={pending || empty}
                  className="mt-2.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-brand/40 hover:text-brand disabled:opacity-40"
                  title={empty ? "Aucune source de ce client ne peut alimenter ce modèle" : undefined}
                >
                  Appliquer
                </button>
              )}
            </div>
          );
        })}
      </div>

      {otherClients.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink">
            <Copy size={13} className="text-brand" /> Copier la mise en page d&apos;un
            autre client
          </p>
          <p className="mt-1 text-[11px] leading-snug text-muted">
            La mise en page seulement — les chiffres sont toujours recalculés pour ce
            client. Les blocs de texte et d&apos;analyse sont copiés tels quels : relis-les,
            ils parlent peut-être de l&apos;autre client.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select
              value={cloneFrom}
              onChange={(e) => {
                setCloneFrom(e.target.value);
                setConfirmClone(false);
              }}
              className="min-w-0 flex-1 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs text-ink outline-none"
            >
              <option value="">Choisir un client…</option>
              {otherClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {confirmClone ? (
              <>
                <button
                  onClick={onClone}
                  disabled={pending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-negative px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {pending && <Loader2 size={12} className="animate-spin" />}
                  Remplacer la mise en page
                </button>
                <button
                  onClick={() => setConfirmClone(false)}
                  className="text-xs font-medium text-muted hover:text-ink"
                >
                  Annuler
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setError("");
                  setConfirmClone(true);
                }}
                disabled={pending || !cloneFrom}
                className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-brand/40 hover:text-brand disabled:opacity-40"
              >
                Copier
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
