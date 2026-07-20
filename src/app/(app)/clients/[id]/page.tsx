import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getActor, getClientFor } from "@/lib/access";
import { getOrCreateReport } from "@/lib/report";
import { getReportData } from "@/lib/report-data";
import { SPAN_CLASS } from "@/components/report/span";
import ReportHeader from "@/components/report/ReportHeader";
import WidgetRenderer from "@/components/report/WidgetRenderer";
import WidgetFrame from "@/components/report/WidgetFrame";
import AddWidgetPanel from "@/components/report/AddWidgetPanel";
import ReportFooter from "@/components/report/ReportFooter";

const PROVIDER_LABEL: Record<string, string> = {
  ga4: "Google Analytics",
  meta: "Facebook / Instagram",
  linkedin: "LinkedIn",
  matomo: "Matomo",
  gmb: "Google Business",
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

  const actor = await getActor();
  if (!actor) redirect("/login");
  const client = await getClientFor(actor, id, "view");
  if (!client) notFound();

  const report = await getOrCreateReport(client.id);
  const widgets = report.widgets;
  const data = await getReportData(client);
  const shareLink = await db.shareLink.findFirst({ where: { reportId: report.id } });
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
        reportId={report.id}
        shareToken={shareLink?.token ?? null}
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
              <WidgetRenderer widget={w} data={data} />
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
        {data.liveSources.length > 0
          ? `Données en direct · ${data.liveSources.map((s) => PROVIDER_LABEL[s] ?? s).join(", ")}`
          : "Données de démonstration — les vrais chiffres s'afficheront une fois les sources branchées."}
      </p>

      <ReportFooter
        agencyName={owner?.agencyName ?? null}
        agencyLogo={owner?.agencyLogo ?? null}
        footerNote={owner?.footerNote ?? null}
      />
    </div>
  );
}
