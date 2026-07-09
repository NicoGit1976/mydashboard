"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Check, ChevronDown, LogOut, Plus } from "lucide-react";
import { initials } from "@/lib/initials";
import MobileNav from "@/components/layout/MobileNav";

type ClientLite = { id: string; name: string; brandColor: string };

function Badge({ name, color, small }: { name: string; color: string; small?: boolean }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded font-bold text-white ${
        small ? "h-5 w-5 text-[10px]" : "h-6 w-6 text-[11px]"
      }`}
      style={{ background: color }}
    >
      {initials(name)}
    </span>
  );
}

export default function Topbar({
  userName,
  clients = [],
  isAdmin = false,
}: {
  userName: string;
  clients?: ClientLite[];
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const currentId = pathname.match(/^\/clients\/([^/]+)/)?.[1];
  const current = clients.find((c) => c.id === currentId);

  return (
    <header className="no-print sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-bg/80 px-6 py-3 backdrop-blur">
      <div className="relative flex items-center gap-3">
        <MobileNav isAdmin={isAdmin} />
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-ink"
        >
          {current ? (
            <>
              <Badge name={current.name} color={current.brandColor} small />
              {current.name}
            </>
          ) : (
            <span className="text-ink-soft">Sélectionner un client</span>
          )}
          <ChevronDown size={15} className="text-muted" />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute left-0 top-11 z-20 w-64 rounded-xl border border-border bg-surface p-1.5 shadow-soft">
              {clients.map((c) => (
                <Link
                  key={c.id}
                  href={`/clients/${c.id}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-bg"
                >
                  <Badge name={c.name} color={c.brandColor} />
                  <span className="flex-1 truncate text-ink">{c.name}</span>
                  {c.id === currentId && <Check size={15} className="text-brand" />}
                </Link>
              ))}
              {clients.length === 0 && (
                <p className="px-2.5 py-2 text-xs text-muted">Aucun client.</p>
              )}
              <Link
                href="/clients/new"
                onClick={() => setOpen(false)}
                className="mt-1 flex items-center gap-2 rounded-lg border-t border-border px-2.5 py-2 text-sm font-medium text-brand transition-colors hover:bg-bg"
              >
                <Plus size={15} /> Nouveau client
              </Link>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title="Déconnexion"
          className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-surface text-ink-soft transition-colors hover:bg-bg"
        >
          <LogOut size={15} />
        </button>
        <div
          title={userName}
          className="grid h-8 w-8 place-items-center rounded-full bg-brand text-xs font-semibold text-white"
        >
          {initials(userName)}
        </div>
      </div>
    </header>
  );
}
