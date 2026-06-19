// Agency signature shown at the bottom of a report (and in the exported PDF).
// White-label: the client's branding is in the body, the agency's here.
export default function ReportFooter({
  agencyName,
  agencyLogo,
  footerNote,
}: {
  agencyName: string | null;
  agencyLogo: string | null;
  footerNote: string | null;
}) {
  if (!agencyName && !agencyLogo && !footerNote) return null;

  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
      <div className="flex items-center gap-2.5">
        {agencyLogo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={agencyLogo}
            alt={agencyName ?? "Agence"}
            className="h-8 w-auto max-w-[140px] object-contain"
          />
        )}
        {agencyName && (
          <span className="text-xs font-semibold text-ink-soft">{agencyName}</span>
        )}
      </div>
      {footerNote && (
        <span className="text-right text-xs text-muted">{footerNote}</span>
      )}
    </div>
  );
}
