"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import type { EChartsOption } from "echarts";

// Thin, dependency-light wrapper around ECharts. Init happens in an effect, so
// it never runs on the server. Resizes with its container.
export default function EChart({
  option,
  height = 260,
  className,
}: {
  option: EChartsOption;
  height?: number | string;
  className?: string;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!elRef.current) return;
    const chart = echarts.init(elRef.current, undefined, { renderer: "canvas" });
    chartRef.current = chart;
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(elRef.current);
    return () => {
      ro.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(option, true);
  }, [option]);

  return (
    <div
      ref={elRef}
      className={className}
      style={{ height, width: "100%" }}
    />
  );
}
