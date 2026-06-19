import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getOrCreateReport } from "@/lib/report";
import ReportHeader from "@/components/report/ReportHeader";
import WidgetRenderer from "@/components/report/WidgetRenderer";
import WidgetFrame from "@/components/report/WidgetFrame";
import AddWidgetPanel from "@/components/report/AddWidgetPanel";
import ReportFooter from "@/components/report/ReportFooter";

// Literal class strings so Tailwind generates them (no dynamic col-span-N).
const SPAN_CLASS: Record<number, string> = {
  3: "col-span-12 sm:col-span-6 xl:col-span-3",
  4: "col-span-12 lg:col-span-4",
  6: "col-span-12 lg:col-span-6",
  8: "col-span-12 xl:col-span-8",
  12: "col-span-12",
};

export default async function ClientReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { id } = await params;
  const { edit } = await searchParams;
  const editMode = edit === "1";

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const client = await db.client.findUnique({ where: { id } });
  if (!client || client.ownerId !== session.user.id) notFound();

  const report = await getOrCreateReport(client.id);
  const widgets = report.widgets;
  const owner = await db.user.findUnique({
    where: { id: session.user.id },
    select: { agencyName: true, agencyLogo: true, footerNote: true },
  });

  return (
    <div className="mx-auto max-w-[1180px] px-6 py-6">
      <ReportHeader
        client={{
          name: client.name,
          sector: client.sector,
          brandColor: client.brandColor,
          logoUrl: client.logoUrl,
        }}
        period={report.periodLabel ?? "—"}
        compare={report.compareLabel ?? ""}
        editMode={editMode}
        toggleHref={editMode ? `/clients/${id}` : `/clients/${id}?edit=1`}
        settingsHref={`/clients/${id}/edit`}
      />

      {editMode && (
        <p className="mt-3 rounded-lg bg-brand-soft px-3 py-2 text-xs font-medium text-brand">
          Mode édition — ajoute, déplace (↑↓), redimensionne (¼…1/1) ou supprime les blocs. Tout est enregistré automatiquement.
        </p>
      )}

      <div className="mt-4 grid grid-cols-12 gap-4">
        {widgets.map((w, i) => (
          <div key={w.id} className={SPAN_CLASS[w.span] ?? "col-span-12"}>
            <WidgetFrame
              widget={w}
              clientId={id}
              isFirst={i === 0}
              isLast={i === widgets.length - 1}
              editMode={editMode}
            >
              <WidgetRenderer widget={w} />
            </WidgetFrame>
          </div>
        ))}

        {editMode && <AddWidgetPanel reportId={report.id} clientId={id} />}

        {widgets.length === 0 && !editMode && (
          <p className="col-span-12 rounded-card border border-dashed border-border bg-surface p-8 text-center text-sm text-muted">
            Rapport vide — passe en mode édition pour ajouter des blocs.
          </p>
        )}
      </div>

      <p className="no-print mt-6 text-center text-xs text-muted">
        Données de démonstration — les vrais chiffres s'afficheront une fois les sources branchées.
      </p>

      <ReportFooter
        agencyName={owner?.agencyName ?? null}
        agencyLogo={owner?.agencyLogo ?? null}
        footerNote={owner?.footerNote ?? null}
      />
    </div>
  );
}
