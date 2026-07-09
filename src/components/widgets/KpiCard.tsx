"use client";

import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { EChartsOption } from "echarts";
import EChart from "@/components/charts/EChart";
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
  source,
  spark,
  format,
  invert = false,
  demo = false,
}: {
  label: string;
  value: number;
  delta?: number;
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
  const hasSpark = spark.length > 0;

  const option: EChartsOption = {
    grid: { left: 0, right: 0, top: 4, bottom: 0 },
    xAxis: { type: "category", show: true, data: spark.map((_, i) => i), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { show: false } },
    yAxis: { type: "value", show: false, scale: true },
    tooltip: { show: false },
    series: [
      {
        type: "line",
        data: spark,
        smooth: true,
        symbol: "none",
        lineStyle: { width: 2, color },
        areaStyle: {
          color: {
            type: "linear",
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: good ? "rgba(22,163,74,.18)" : "rgba(225,29,72,.18)" },
              { offset: 1, color: "rgba(255,255,255,0)" },
            ],
          },
        },
      },
    ],
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
        </div>
        {hasSpark && (
          <div className="h-9 w-24 shrink-0">
            <EChart option={option} height={36} />
          </div>
        )}
      </div>
    </div>
  );
}
