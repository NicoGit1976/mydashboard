"use client";

import type { ChartConfiguration } from "chart.js";
import Chart from "@/components/charts/Chart";
import { C, CHART_PALETTE } from "@/lib/theme";
import { fmtInt } from "@/lib/format";

export default function DonutChartCard({
  data,
  centerValue,
  centerLabel,
  height = 250,
}: {
  data: { name: string; value: number }[];
  centerValue: string;
  centerLabel: string;
  height?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;

  const config: ChartConfiguration<"doughnut"> = {
    type: "doughnut",
    data: {
      labels: data.map((d) => d.name),
      datasets: [
        {
          data: data.map((d) => d.value),
          backgroundColor: data.map((_, i) => CHART_PALETTE[i % CHART_PALETTE.length]),
          borderColor: "#fff",
          borderWidth: 2,
          hoverOffset: 4,
        },
      ],
    },
    options: {
      cutout: "70%",
      // Leaves room under the ring for the legend, and keeps the hole centred
      // on the absolutely-positioned total below.
      layout: { padding: { top: 4, bottom: 4 } },
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            boxWidth: 8,
            boxHeight: 8,
            usePointStyle: true,
            pointStyle: "circle",
            color: C.inkSoft,
            font: { size: 11.5 },
            padding: 12,
          },
        },
        tooltip: {
          backgroundColor: "#fff",
          borderColor: C.border,
          borderWidth: 1,
          titleColor: C.ink,
          bodyColor: C.ink,
          padding: 10,
          callbacks: {
            label: (item) => {
              const v = Number(item.parsed);
              const pct = Math.round((v / total) * 1000) / 10;
              return ` ${item.label} : ${fmtInt(v)} (${pct} %)`;
            },
          },
        },
      },
    },
  };

  return (
    <div className="relative">
      <Chart config={config} height={height} />
      <div className="pointer-events-none absolute inset-x-0 top-[44%] -translate-y-1/2 text-center">
        <div className="text-xl font-semibold leading-none text-ink">{centerValue}</div>
        <div className="mt-1 text-[11px] text-muted">{centerLabel}</div>
      </div>
    </div>
  );
}
