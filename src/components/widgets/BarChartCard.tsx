"use client";

import type { EChartsOption } from "echarts";
import EChart from "@/components/charts/EChart";
import { SOURCES, type SourceKey } from "@/lib/sources";
import { C, splitLine, axisLabelStyle } from "@/lib/theme";
import { fmtInt } from "@/lib/format";

export default function BarChartCard({
  data,
  height = 200,
}: {
  data: { name: string; value: number; source: SourceKey }[];
  height?: number;
}) {
  // Category axis paints first item at the bottom, so reverse to show the
  // largest on top.
  const rows = [...data].reverse();

  const option: EChartsOption = {
    grid: { left: 4, right: 44, top: 8, bottom: 4, containLabel: true },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    xAxis: { type: "value", splitLine, axisLabel: axisLabelStyle },
    yAxis: {
      type: "category",
      data: rows.map((r) => r.name),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: C.inkSoft, fontSize: 12 },
    },
    series: [
      {
        type: "bar",
        barWidth: 14,
        data: rows.map((r) => ({
          value: r.value,
          itemStyle: { color: SOURCES[r.source].color, borderRadius: [0, 7, 7, 0] },
        })),
        label: {
          show: true,
          position: "right",
          color: C.inkSoft,
          fontSize: 11,
          formatter: (p: { value: number }) => fmtInt(p.value),
        },
      },
    ],
  };

  return <EChart option={option} height={height} />;
}
