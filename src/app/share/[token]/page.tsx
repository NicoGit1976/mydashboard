import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getReportData } from "@/lib/report-data";
import { initials } from "@/lib/initials";
import { SPAN_CLASS } from "@/components/report/span";
import WidgetRenderer from "@/components/report/WidgetRenderer";
import ReportFooter from "@/components/report/ReportFooter";
import PrintButton from "@/components/report/PrintButton";

// Public, read-only report view — reached via an unguessable share token.
// No session, no app chrome, no edit affordances. Same live data pipeline as
// the authenticated report.

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function SharedReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!/^[a-f0-9]{16,64}$/.test(token)) notFound();

  const link = await db.shareLink.findUnique({
    where: { token },
    include: {
      report: {
        include: {
          widgets: { orderBy: { position: "asc" } },
          client: { include: { owner: { select: { agencyName: true, agencyLogo: true, footerNote: true } } } },
        },
      },
    },
  });
  if (!link) notFound();

  const report = link.report;
  const client = report.client;
  // readOnly: public viewers must never mutate the owner's connection state.
  const data = await getReportData(client, true);

  return (
    <div className="mx-auto max-w-[1180px] px-6 py-6">
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
              <h1 className="text-lg font-semibold tracking-tight text-ink">{client.name}</h1>
              {client.sector && (
                <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand">
                  {client.sector}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-ink-soft">
              {report.title} · {report.periodLabel ?? "—"}{" "}
              {report.compareLabel && <span className="text-muted">· {report.compareLabel}</span>}
            </p>
          </div>
        </div>
        <div className="no-print">
          <PrintButton />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-12 gap-4">
        {report.widgets.map((w) => (
          <div key={w.id} className={SPAN_CLASS[w.span] ?? "col-span-12"}>
            <WidgetRenderer widget={w} data={data} />
          </div>
        ))}
      </div>

      <ReportFooter
        agencyName={client.owner.agencyName}
        agencyLogo={client.owner.agencyLogo}
        footerNote={client.owner.footerNote}
      />
    </div>
  );
}
