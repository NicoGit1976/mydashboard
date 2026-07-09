"use client";

import { useRef, useState, useTransition } from "react";
import { Check, Copy, Link2, Loader2, Share2, X } from "lucide-react";
import { getOrCreateShareLink, revokeShareLink } from "@/lib/share-actions";

// "Partager" → creates (or reuses) the report's public link, shows it in a
// small popover with copy + revoke. The link works without any login.
export default function ShareButton({
  reportId,
  initialToken,
}: {
  reportId: string;
  initialToken: string | null;
}) {
  const [token, setToken] = useState<string | null>(initialToken);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const url = token ? `${typeof window !== "undefined" ? window.location.origin : ""}/share/${token}` : "";

  function onShare() {
    if (token) {
      setOpen((o) => !o);
      return;
    }
    startTransition(async () => {
      const res = await getOrCreateShareLink(reportId);
      if (res.ok && res.token) {
        setToken(res.token);
        setOpen(true);
      }
    });
  }

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      inputRef.current?.select();
    }
  }

  function onRevoke() {
    startTransition(async () => {
      const res = await revokeShareLink(reportId);
      if (res.ok) {
        setToken(null);
        setOpen(false);
      }
    });
  }

  return (
    <div className="relative">
      <button
        onClick={onShare}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-bg disabled:opacity-60"
      >
        {pending ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}
        Partager
      </button>

      {open && token && (
        <div className="absolute right-0 top-11 z-30 w-80 rounded-card border border-border bg-surface p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink">
              <Link2 size={14} className="text-brand" /> Lien public du rapport
            </p>
            <button
              onClick={() => setOpen(false)}
              className="grid h-6 w-6 place-items-center rounded-md text-muted hover:bg-bg"
              aria-label="Fermer"
            >
              <X size={14} />
            </button>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            Toute personne disposant de ce lien peut consulter le rapport (lecture seule, sans compte).
          </p>
          <div className="mt-2 flex gap-1.5">
            <input
              ref={inputRef}
              readOnly
              value={url}
              onFocus={(e) => e.target.select()}
              className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-2.5 py-1.5 text-[11px] text-ink-soft outline-none"
            />
            <button
              onClick={onCopy}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-brand px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? "Copié" : "Copier"}
            </button>
          </div>
          <button
            onClick={onRevoke}
            disabled={pending}
            className="mt-2 text-[11px] font-medium text-negative hover:underline disabled:opacity-60"
          >
            Révoquer le lien (le rendre inaccessible)
          </button>
        </div>
      )}
    </div>
  );
}
