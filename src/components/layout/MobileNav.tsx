"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Menu, X } from "lucide-react";
import { navFor } from "@/components/layout/nav";

// Hamburger + slide-in drawer for < md screens (the sidebar is md:flex only, so
// without this the whole app is unreachable on mobile).
export default function MobileNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const items = navFor(isAdmin);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(true)}
        aria-label="Ouvrir le menu"
        className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface text-ink-soft transition-colors hover:bg-bg"
      >
        <Menu size={18} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-ink/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="relative flex h-full w-64 flex-col border-r border-border bg-surface px-3 py-5">
            <div className="flex items-center justify-between px-2 pb-6">
              <span className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white">
                  <LayoutDashboard size={18} />
                </div>
                <span className="text-[15px] font-semibold tracking-tight text-ink">
                  My<span className="text-brand">Dashboard</span>
                </span>
              </span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Fermer le menu"
                className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-bg"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              {items.map((item) => {
                const Icon = item.icon;
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      active ? "bg-brand-soft text-brand" : "text-ink-soft hover:bg-bg"
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
