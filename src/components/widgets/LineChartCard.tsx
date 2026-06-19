"use client";

import type { EChartsOption } from "echarts";
import EChart from "@/components/charts/EChart";
import { C, CHART_PALETTE, splitLine, axisLabelStyle } from "@/lib/theme";

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
  const option: EChartsOption = {
    color: CHART_PALETTE,
    grid: { left: 4, right: 12, top: 32, bottom: 4, containLabel: true },
    legend: {
      top: 0,
      right: 0,
      icon: "roundRect",
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 16,
      textStyle: { color: C.inkSoft, fontSize: 12 },
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "#fff",
      borderColor: C.border,
      borderWidth: 1,
      textStyle: { color: C.ink, fontSize: 12 },
      padding: [8, 12],
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: labels,
      axisLabel: { ...axisLabelStyle, interval: 4 },
      axisLine: { lineStyle: { color: C.border } },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      splitLine,
      axisLabel: axisLabelStyle,
    },
    series: [
      {
        name: "Sessions",
        type: "line",
        data: sessions,
        smooth: true,
        symbol: "none",
        lineStyle: { width: 2.5 },
        areaStyle: {
          color: {
            type: "linear",
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(79,70,229,.16)" },
              { offset: 1, color: "rgba(79,70,229,0)" },
            ],
          },
        },
      },
      {
        name: "Visiteurs",
        type: "line",
        data: users,
        smooth: true,
        symbol: "none",
        lineStyle: { width: 2.5 },
      },
    ],
  };

  return <EChart option={option} height={height} />;
}
