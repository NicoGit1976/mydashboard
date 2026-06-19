"use client";

import Link from "next/link";
import { Check, Download, Pencil, Settings, Share2 } from "lucide-react";
import { initials } from "@/lib/initials";

type Props = {
  client: {
    name: string;
    sector: string | null;
    brandColor: string;
    logoUrl: string | null;
  };
  period: string;
  compare: string;
  editMode: boolean;
  toggleHref: string;
  settingsHref: string;
};

export default function ReportHeader({
  client,
  period,
  compare,
  editMode,
  toggleHref,
  settingsHref,
}: Props) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-border/60 bg-surface p-5 shadow-soft"
      style={{ borderTop: `3px solid ${client.brandColor}` }}
    >
      <div className="flex items-center gap-4">
        {client.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={client.logoUrl}
            alt={client.name}
            className="h-12 w-12 rounded-xl border border-border object-cover"
          />
        ) : (
          <div
            className="grid h-12 w-12 place-items-center rounded-xl text-base font-bold text-white"
            style={{ background: client.brandColor }}
          >
            {initials(client.name)}
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight text-ink">
              {client.name}
            </h1>
            {client.sector && (
              <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand">
                {client.sector}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-ink-soft">
            Rapport de performance · {period}{" "}
            {compare && <span className="text-muted">· {compare}</span>}
          </p>
        </div>
      </div>

      <div className="no-print flex items-center gap-2">
        {editMode ? (
          <Link
            href={toggleHref}
            className="inline-flex items-center gap-2 rounded-lg bg-positive px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
          >
            <Check size={16} /> Terminer
          </Link>
        ) : (
          <>
            <Link
              href={settingsHref}
              title="Réglages du client"
              className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-white text-ink-soft transition-colors hover:bg-bg"
            >
              <Settings size={16} />
            </Link>
            <Link
              href={toggleHref}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-bg"
            >
              <Pencil size={16} /> Modifier
            </Link>
            <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-bg">
              <Share2 size={16} /> Partager
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              <Download size={16} /> Exporter en PDF
            </button>
          </>
        )}
      </div>
    </div>
  );
}
