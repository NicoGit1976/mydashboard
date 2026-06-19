"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  Images,
  LayoutDashboard,
  Plug,
  Settings,
  Users,
} from "lucide-react";

const nav = [
  { label: "Vue d'ensemble", icon: LayoutDashboard, href: "/overview" },
  { label: "Clients", icon: Users, href: "/clients" },
  { label: "Rapports", icon: FileText, href: "/reports" },
  { label: "Sources de données", icon: Plug, href: "/sources" },
  { label: "Bibliothèque", icon: Images, href: "/library" },
  { label: "Réglages", icon: Settings, href: "/settings" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="no-print sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-surface px-3 py-5 md:flex">
      <div className="flex items-center gap-2 px-2 pb-6">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white">
          <LayoutDashboard size={18} />
        </div>
        <span className="text-[15px] font-semibold tracking-tight text-ink">
          My<span className="text-brand">Dashboard</span>
        </span>
      </div>

      <nav className="flex flex-col gap-1">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = item.href !== "#" && pathname.startsWith(item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active ? "bg-brand-soft text-brand" : "text-ink-soft hover:bg-bg"
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-card border border-border bg-bg p-3">
        <p className="text-xs font-semibold text-ink">Studio perso</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
          Tes rapports, tes données, ton PDF. Zéro abonnement tiers.
        </p>
      </div>
    </aside>
  );
}
