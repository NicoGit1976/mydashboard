"use client";

import { useActionState, useState, useTransition } from "react";
import { Check, Copy, Link2, Power, Trash2 } from "lucide-react";
import {
  createShortLink,
  deleteShortLink,
  toggleShortLink,
  type ShortlinkState,
} from "@/lib/shortlink-actions";

export type ShortLinkRow = {
  id: string;
  code: string;
  shortUrl: string;
  originalUrl: string;
  label: string | null;
  channel: string | null;
  disabled: boolean;
  clicks28: number;
  uniques28: number;
};

const CHANNEL_LABEL: Record<string, string> = {
  linkedin: "LinkedIn",
  facebook: "Facebook",
  instagram: "Instagram",
  x: "X",
  gmb: "Google Business",
};

const inputCls =
  "mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-xs text-ink outline-none transition-colors focus:border-brand";

// Short links of one client: create + list + enable/disable + delete.
// Clicks are first-party data — they feed the report even for networks whose
// stats APIs are locked.
export default function ShortLinksCard({
  clientId,
  links,
}: {
  clientId: string;
  links: ShortLinkRow[];
}) {
  const [state, formAction, pending] = useActionState<ShortlinkState, FormData>(
    createShortLink.bind(null, clientId),
    null,
  );
  const [copied, setCopied] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* the row shows the full URL — manual copy still possible */
    }
  }

  return (
    <div className="mt-4 rounded-card border border-border/60 bg-surface p-6 shadow-soft">
      <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
        <Link2 size={15} className="text-brand" /> Liens courts
      </p>
      <p className="mb-3 mt-0.5 text-xs text-muted">
        Chaque clic est mesuré <strong className="font-medium text-ink-soft">ici</strong> (pas
        chez le réseau) et alimente le rapport — y compris pour les réseaux qui ne donnent
        pas leurs statistiques. Les balises UTM sont ajoutées automatiquement.
      </p>

      <form action={formAction} className="rounded-lg border border-border bg-white p-3">
        <div className="grid gap-2 sm:grid-cols-[1fr_140px_120px]">
          <div>
            <label className="block text-[11px] font-medium text-ink-soft">URL à raccourcir</label>
            <input name="url" required placeholder="https://…" spellCheck={false} className={inputCls} />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-ink-soft">Canal</label>
            <select name="channel" defaultValue="" className={inputCls}>
              <option value="">— Générique —</option>
              {Object.entries(CHANNEL_LABEL).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-ink-soft">Libellé (opt.)</label>
            <input name="label" placeholder="Promo mai" className={inputCls} />
          </div>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? "Création…" : "Créer le lien court"}
        </button>
        {state && (
          <p className={`mt-2 text-[11px] font-medium ${state.ok ? "text-positive" : "text-negative"}`}>
            {state.message}
            {state.ok && state.shortUrl && (
              <button
                type="button"
                onClick={() => copy(state.shortUrl!)}
                className="ml-2 inline-flex items-center gap-1 rounded-md bg-brand-soft px-1.5 py-0.5 font-mono text-[11px] text-brand hover:underline"
              >
                {copied === state.shortUrl ? <Check size={11} /> : <Copy size={11} />}
                {state.shortUrl.replace(/^https?:\/\//, "")}
              </button>
            )}
          </p>
        )}
      </form>

      {links.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {links.map((l) => (
            <div
              key={l.id}
              className={`flex flex-wrap items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 ${l.disabled ? "opacity-60" : ""}`}
            >
              <button
                type="button"
                onClick={() => copy(l.shortUrl)}
                title="Copier"
                className="inline-flex items-center gap-1 rounded-md bg-bg px-1.5 py-0.5 font-mono text-[11px] text-ink-soft hover:text-brand"
              >
                {copied === l.shortUrl ? <Check size={11} className="text-positive" /> : <Copy size={11} />}
                /l/{l.code}
              </button>
              <span className="min-w-0 flex-1 truncate text-[11px] text-muted" title={l.originalUrl}>
                {l.label ? `${l.label} · ` : ""}{l.originalUrl}
              </span>
              {l.channel && (
                <span className="rounded-full bg-bg px-1.5 py-0.5 text-[10px] font-medium text-muted">
                  {CHANNEL_LABEL[l.channel] ?? l.channel}
                </span>
              )}
              <span className="text-[11px] font-semibold text-ink" title="Clics (28 j) · visiteurs uniques">
                {l.clicks28} clics · {l.uniques28} uniq.
              </span>
              <button
                type="button"
                title={l.disabled ? "Réactiver" : "Désactiver"}
                onClick={() => startTransition(async () => { await toggleShortLink(l.id, clientId); })}
                className={`grid h-6 w-6 place-items-center rounded-md ${l.disabled ? "text-muted hover:text-positive" : "text-positive hover:text-muted"} hover:bg-bg`}
              >
                <Power size={13} />
              </button>
              <button
                type="button"
                title="Supprimer"
                onClick={() => startTransition(async () => { await deleteShortLink(l.id, clientId); })}
                className="grid h-6 w-6 place-items-center rounded-md text-muted hover:bg-bg hover:text-negative"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
