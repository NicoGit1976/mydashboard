"use client";

import type { ChartConfiguration, Plugin } from "chart.js";
import Chart from "@/components/charts/Chart";
import { SOURCES, type SourceKey } from "@/lib/sources";
import { C, tickStyle, gridStyle } from "@/lib/theme";
import { fmtInt } from "@/lib/format";

// Chart.js ships no data labels, and the alternative is a whole extra
// dependency for one line of text per bar. This draws the value just past the
// end of each bar, which is all the widget ever needed.
const valueLabels: Plugin<"bar"> = {
  id: "valueLabels",
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    ctx.save();
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillStyle = C.inkSoft;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    for (const meta of chart.getSortedVisibleDatasetMetas()) {
      meta.data.forEach((bar, i) => {
        const raw = chart.data.datasets[meta.index].data[i];
        ctx.fillText(fmtInt(Number(raw)), bar.x + 8, bar.y);
      });
    }
    ctx.restore();
  },
};

export default function BarChartCard({
  data,
  height = 200,
}: {
  data: { name: string; value: number; source: SourceKey }[];
  height?: number;
}) {
  // Chart.js draws the first category at the TOP on a horizontal bar chart, so
  // the incoming order (largest first) is already what we want — unlike
  // ECharts, which drew it bottom-up and needed the array reversed.
  const config: ChartConfiguration<"bar"> = {
    type: "bar",
    data: {
      labels: data.map((r) => r.name),
      datasets: [
        {
          data: data.map((r) => r.value),
          backgroundColor: data.map((r) => SOURCES[r.source].color),
          borderRadius: { topLeft: 0, bottomLeft: 0, topRight: 7, bottomRight: 7 },
          borderSkipped: false,
          barThickness: 14,
        },
      ],
    },
    options: {
      indexAxis: "y",
      // Room on the right for the value labels the plugin draws outside the bar.
      layout: { padding: { right: 44 } },
      scales: {
        x: { grid: gridStyle, border: { display: false }, ticks: tickStyle, beginAtZero: true },
        y: {
          grid: { display: false },
          border: { display: false },
          ticks: { color: C.inkSoft, font: { size: 12 } },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#fff",
          borderColor: C.border,
          borderWidth: 1,
          titleColor: C.ink,
          bodyColor: C.ink,
          padding: 10,
          displayColors: false,
          callbacks: { label: (item) => ` ${fmtInt(Number(item.parsed.x))}` },
        },
      },
    },
    plugins: [valueLabels],
  };

  return <Chart config={config} height={height} />;
}
