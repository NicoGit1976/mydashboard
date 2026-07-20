import Link from "next/link";
import { db } from "@/lib/db";
import { initials } from "@/lib/initials";
import { getActor, visibleReportsWhere } from "@/lib/access";

export default async function ReportsPage() {
  const actor = await getActor();
  const reports = actor
    ? await db.report.findMany({
        where: visibleReportsWhere(actor),
        include: { client: true, _count: { select: { widgets: true } } },
        orderBy: { updatedAt: "desc" },
      })
    : [];

  return (
    <div className="mx-auto max-w-[1180px] px-6 py-6">
      <h1 className="text-xl font-semibold tracking-tight text-ink">Rapports</h1>
      <p className="mt-1 text-sm text-ink-soft">
        {reports.length} rapport{reports.length > 1 ? "s" : ""} — un par client.
      </p>

      <div className="mt-5 grid grid-cols-12 gap-4">
        {reports.map((r) => (
          <Link
            key={r.id}
            href={`/clients/${r.clientId}`}
            className="col-span-12 flex items-center gap-3 rounded-card border border-border/60 bg-surface p-4 shadow-soft transition-colors hover:border-brand/40 sm:col-span-6 lg:col-span-4"
          >
            <div
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-sm font-bold text-white"
              style={{ background: r.client.brandColor }}
            >
              {initials(r.client.name)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{r.client.name}</p>
              <p className="truncate text-xs text-muted">
                {r.title} · {r.periodLabel ?? "—"} · {r._count.widgets} blocs
              </p>
            </div>
          </Link>
        ))}

        {reports.length === 0 && (
          <p className="col-span-12 rounded-card border border-dashed border-border bg-surface p-8 text-center text-sm text-muted">
            Aucun rapport — crée un client, son rapport est généré automatiquement.
          </p>
        )}
      </div>
    </div>
  );
}
