"use client";

import type { EChartsOption } from "echarts";
import EChart from "@/components/charts/EChart";
import { C, CHART_PALETTE } from "@/lib/theme";

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
  const option: EChartsOption = {
    color: CHART_PALETTE,
    tooltip: { trigger: "item", formatter: "{b} : {c} %" },
    legend: {
      bottom: 0,
      left: "center",
      icon: "circle",
      itemWidth: 8,
      itemHeight: 8,
      itemGap: 12,
      textStyle: { color: C.inkSoft, fontSize: 11.5 },
    },
    series: [
      {
        type: "pie",
        radius: ["56%", "80%"],
        center: ["50%", "44%"],
        avoidLabelOverlap: true,
        label: { show: false },
        labelLine: { show: false },
        itemStyle: { borderColor: "#fff", borderWidth: 2 },
        data,
      },
    ],
  };

  return (
    <div className="relative">
      <EChart option={option} height={height} />
      <div className="pointer-events-none absolute inset-x-0 top-[44%] -translate-y-1/2 text-center">
        <div className="text-xl font-semibold leading-none text-ink">
          {centerValue}
        </div>
        <div className="mt-1 text-[11px] text-muted">{centerLabel}</div>
      </div>
    </div>
  );
}
