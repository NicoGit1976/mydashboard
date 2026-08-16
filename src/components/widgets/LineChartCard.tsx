"use client";

import type { ChartConfiguration, ScriptableContext } from "chart.js";
import Chart from "@/components/charts/Chart";
import { C, CHART_PALETTE, categoryAxis, valueAxis } from "@/lib/theme";
import { fmtInt } from "@/lib/format";

// The soft wash under the sessions line. Built from the canvas context because
// a gradient needs the drawing surface's real pixel height, which only exists
// once the chart has laid itself out.
function areaFill(ctx: ScriptableContext<"line">) {
  const { chart } = ctx;
  const { ctx: canvas, chartArea } = chart;
  if (!chartArea) return "rgba(79,70,229,.16)";
  const g = canvas.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  g.addColorStop(0, "rgba(79,70,229,.16)");
  g.addColorStop(1, "rgba(79,70,229,0)");
  return g;
}

export default function LineChartCard({
  labels,
  sessions,
  users,
  height = 280,
}: {
  labels: string[];
  sessions: number[];
  users: number[];
  height?: number;
}) {
  const config: ChartConfiguration<"line"> = {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Sessions",
          data: sessions,
          borderColor: CHART_PALETTE[0],
          backgroundColor: areaFill,
          borderWidth: 2.5,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4,
          fill: true,
        },
        {
          label: "Visiteurs",
          data: users,
          borderColor: CHART_PALETTE[1],
          borderWidth: 2.5,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4,
          fill: false,
        },
      ],
    },
    options: {
      layout: { padding: { top: 4, right: 8 } },
      interaction: { mode: "index", intersect: false },
      scales: { x: categoryAxis, y: { ...valueAxis, beginAtZero: true } },
      plugins: {
        legend: {
          align: "end",
          labels: {
            boxWidth: 10,
            boxHeight: 10,
            usePointStyle: true,
            pointStyle: "rectRounded",
            color: C.inkSoft,
            font: { size: 12 },
            padding: 16,
          },
        },
        tooltip: {
          backgroundColor: "#fff",
          borderColor: C.border,
          borderWidth: 1,
          titleColor: C.ink,
          bodyColor: C.ink,
          padding: 10,
          displayColors: true,
          callbacks: {
            label: (item) => ` ${item.dataset.label} : ${fmtInt(Number(item.parsed.y))}`,
          },
        },
      },
    },
  };

  return <Chart config={config} height={height} />;
}
