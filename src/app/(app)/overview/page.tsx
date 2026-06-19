import Link from "next/link";
import { FileText, LayoutGrid, Plug, Plus, Users } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { initials } from "@/lib/initials";

export default async function OverviewPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const [clientCount, reportCount, widgetCount, sourceCount, recent] = await Promise.all([
    db.client.count({ where: { ownerId: userId } }),
    db.report.count({ where: { client: { ownerId: userId } } }),
    db.widget.count({ where: { report: { client: { ownerId: userId } } } }),
    db.connection.count({ where: { ownerId: userId } }),
    db.report.findMany({
      where: { client: { ownerId: userId } },
      include: { client: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
  ]);

  const stats = [
    { label: "Clients", value: clientCount, Icon: Users, href: "/clients" },
    { label: "Rapports", value: reportCount, Icon: FileText, href: "/reports" },
    { label: "Blocs créés", value: widgetCount, Icon: LayoutGrid, href: "/reports" },
    { label: "Sources connectées", value: sourceCount, Icon: Plug, href: "/sources" },
  ];

  return (
    <div className="mx-auto max-w-[1180px] px-6 py-6">
      <h1 className="text-xl font-semibold tracking-tight text-ink">
        Bonjour {session.user.name ?? ""} 👋
      </h1>
      <p className="mt-1 text-sm text-ink-soft">Vue d'ensemble de ton activité.</p>

      <div className="mt-5 grid grid-cols-12 gap-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="col-span-6 flex flex-col gap-3 rounded-card border border-border/60 bg-surface p-5 shadow-soft transition-colors hover:border-brand/40 lg:col-span-3"
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-soft text-brand">
              <s.Icon size={18} />
            </span>
            <div>
              <p className="text-[26px] font-semibold leading-none text-ink">{s.value}</p>
              <p className="mt-1 text-xs text-muted">{s.label}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-12 gap-4">
        <section className="col-span-12 rounded-card border border-border/60 bg-surface p-5 shadow-soft lg:col-span-8">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Rapports récents</h2>
            <Link href="/reports" className="text-xs font-medium text-brand hover:underline">
              Tout voir
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {recent.map((r) => (
              <Link
                key={r.id}
                href={`/clients/${r.clientId}`}
                className="flex items-center gap-3 rounded-lg border border-border/60 bg-white p-2.5 transition-colors hover:border-brand/40"
              >
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-bold text-white"
                  style={{ background: r.client.brandColor }}
                >
                  {initials(r.client.name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{r.client.name}</p>
                  <p className="truncate text-xs text-muted">{r.title} · {r.periodLabel ?? "—"}</p>
                </div>
              </Link>
            ))}
            {recent.length === 0 && (
              <Link
                href="/clients/new"
                className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border p-4 text-sm text-muted transition-colors hover:border-brand/40 hover:text-brand"
              >
                <Plus size={16} /> Crée ton premier client
              </Link>
            )}
          </div>
        </section>

        <aside className="col-span-12 flex flex-col justify-between gap-4 rounded-card border border-border/60 bg-gradient-to-br from-brand-soft to-white p-5 shadow-soft lg:col-span-4">
          <div>
            <h2 className="text-sm font-semibold text-ink">Branche tes données</h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">
              Connecte Matomo, GA4, Meta, GMB ou LinkedIn pour remplacer les chiffres de démo par tes vraies données.
            </p>
          </div>
          <Link
            href="/sources"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            <Plug size={16} /> Sources de données
          </Link>
        </aside>
      </div>
    </div>
  );
}
