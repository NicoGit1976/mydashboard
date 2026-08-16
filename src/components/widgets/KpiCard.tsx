"use client";

import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { ChartConfiguration, ScriptableContext } from "chart.js";
import Chart from "@/components/charts/Chart";
import SourceBadge from "@/components/report/SourceBadge";
import { fmtCompact, fmtDuration, fmtPct } from "@/lib/format";
import { C } from "@/lib/theme";
import type { SourceKey } from "@/lib/sources";

function displayValue(value: number, format?: string) {
  if (format === "percent")
    return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value)} %`;
  if (format === "duration") return fmtDuration(value);
  return fmtCompact(value);
}

export default function KpiCard({
  label,
  value,
  delta,
  deltaYoy,
  source,
  spark,
  format,
  invert = false,
  demo = false,
}: {
  label: string;
  value: number;
  delta?: number;
  deltaYoy?: number;
  source: SourceKey;
  spark: number[];
  format?: string;
  invert?: boolean;
  demo?: boolean;
}) {
  const hasDelta = typeof delta === "number";
  const rawUp = hasDelta && delta! >= 0;
  // "good" respects lower-is-better metrics (bounce rate): a drop is positive.
  const good = !hasDelta || (invert ? delta! <= 0 : delta! >= 0);
  const color = good ? C.positive : C.negative;
  // Year-over-year: the comparison that survives seasonality. Shown second and
  // quieter — it explains the headline delta, it doesn't replace it.
  const hasYoy = typeof deltaYoy === "number";
  const yoyGood = hasYoy && (invert ? deltaYoy! <= 0 : deltaYoy! >= 0);
  const hasSpark = spark.length > 0;

  // Sparkline: no axes, no grid, no interaction — it is a shape, not a chart.
  const sparkFill = (ctx: ScriptableContext<'line'>) => {
    const { chart } = ctx;
    const area = chart.chartArea;
    if (!area) return 'rgba(255,255,255,0)';
    const g = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
    g.addColorStop(0, good ? 'rgba(22,163,74,.18)' : 'rgba(225,29,72,.18)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    return g;
  };

  const sparkConfig: ChartConfiguration<'line'> = {
    type: 'line',
    data: {
      labels: spark.map((_, i) => i),
      datasets: [
        {
          data: spark,
          borderColor: color,
          backgroundColor: sparkFill,
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 0,
          fill: true,
        },
      ],
    },
    options: {
      layout: { padding: { top: 4 } },
      scales: { x: { display: false }, y: { display: false } },
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
    },
  };

  return (
    <div className="flex flex-col gap-3 rounded-card border border-border/60 bg-surface p-4 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-ink-soft">{label}</span>
        <span className="flex items-center gap-1.5">
          {demo && (
            <span
              title="Donnée de démonstration — branche la source pour la remplacer"
              className="rounded-full bg-bg px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted"
            >
              démo
            </span>
          )}
          <SourceBadge source={source} />
        </span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-[26px] font-semibold leading-none tracking-tight text-ink">
            {displayValue(value, format)}
          </span>
          {hasDelta ? (
            <span
              className="inline-flex items-center gap-1 text-xs font-semibold"
              style={{ color }}
            >
              {rawUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {fmtPct(delta!)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted">
              <Minus size={14} /> tendance n/d
            </span>
          )}
          {hasYoy && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted">
              <span style={{ color: yoyGood ? C.positive : C.negative }}>
                {fmtPct(deltaYoy!)}
              </span>
              vs an dernier
            </span>
          )}
        </div>
        {hasSpark && (
          <div className="h-9 w-24 shrink-0">
            <Chart config={sparkConfig} height={36} />
          </div>
        )}
      </div>
    </div>
  );
}
