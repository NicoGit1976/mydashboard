import { fmtDuration, fmtInt } from "@/lib/format";
import { C } from "@/lib/theme";
import type { PageRow } from "@/lib/mock-data";

export default function TableCard({ rows }: { rows: PageRow[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
          <th className="pb-2 font-medium">Page</th>
          <th className="pb-2 text-right font-medium">Vues</th>
          <th className="pb-2 text-right font-medium">Tps moyen</th>
          <th className="pb-2 text-right font-medium">Rebond</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const bounceColor =
            r.bounce >= 40 ? C.negative : r.bounce >= 30 ? "#d97706" : C.positive;
          return (
            <tr key={r.page} className="border-t border-border/60">
              <td className="py-2.5 font-medium text-ink">{r.page}</td>
              <td className="py-2.5 text-right tabular-nums text-ink-soft">
                {fmtInt(r.views)}
              </td>
              <td className="py-2.5 text-right tabular-nums text-ink-soft">
                {fmtDuration(r.avgTime)}
              </td>
              <td className="py-2.5 text-right tabular-nums">
                <span style={{ color: bounceColor }} className="font-semibold">
                  {r.bounce} %
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
