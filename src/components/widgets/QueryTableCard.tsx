import { fmtInt } from "@/lib/format";
import { C } from "@/lib/theme";
import type { QueryRow } from "@/lib/mock-data";

// Average position colours the way a search marketer reads it: the first page
// is roughly the top ten, and the first three results take most of the clicks.
function positionColor(p: number): string {
  if (p <= 3) return C.positive;
  if (p <= 10) return "#d97706";
  return C.negative;
}

export default function QueryTableCard({ rows }: { rows: QueryRow[] }) {
  if (rows.length === 0)
    return (
      <p className="py-6 text-center text-sm text-muted">
        Aucune requête sur la période.
      </p>
    );

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
          <th className="pb-2 font-medium">Requête</th>
          <th className="pb-2 text-right font-medium">Clics</th>
          <th className="pb-2 text-right font-medium">Impressions</th>
          <th className="pb-2 text-right font-medium">CTR</th>
          <th className="pb-2 text-right font-medium">Position</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.query} className="border-t border-border/60">
            <td className="max-w-0 truncate py-2.5 pr-3 font-medium text-ink" title={r.query}>
              {r.query}
            </td>
            <td className="py-2.5 text-right tabular-nums font-semibold text-ink">
              {fmtInt(r.clicks)}
            </td>
            <td className="py-2.5 text-right tabular-nums text-ink-soft">
              {fmtInt(r.impressions)}
            </td>
            <td className="py-2.5 text-right tabular-nums text-ink-soft">
              {r.ctr.toString().replace(".", ",")} %
            </td>
            <td className="py-2.5 text-right tabular-nums">
              <span style={{ color: positionColor(r.position) }} className="font-semibold">
                {r.position.toString().replace(".", ",")}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
