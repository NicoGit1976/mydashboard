"use client";

import { useEffect, useRef } from "react";
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  DoughnutController,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartConfiguration,
  type ChartType,
} from "chart.js";

// Register only what the report widgets use, rather than `registerables` —
// the bundle carries the whole library otherwise.
ChartJS.register(
  LineController,
  BarController,
  DoughnutController,
  LineElement,
  PointElement,
  BarElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  Filler,
  Legend,
  Tooltip,
);

// Reports are printed. Two consequences, both handled here so no widget has to
// remember them:
//
// 1. Chart.js draws to a canvas — a bitmap. At screen density it turns soft
//    when the browser scales the page up to print resolution, so the backing
//    store is rendered at 3x regardless of the screen's own ratio.
// 2. "Exporter en PDF" calls window.print() immediately. An animation still
//    running at that moment prints half-drawn, so animation is off: a report
//    needs to be deterministic more than it needs to be lively.
const PRINT_PIXEL_RATIO = 3;

// Generic over the chart type so each widget keeps its own option surface —
// `cutout` on a doughnut, `indexAxis` on a bar — instead of the narrow set
// every chart type has in common.
export default function Chart<T extends ChartType>({
  config,
  height = 260,
  className,
}: {
  config: ChartConfiguration<T>;
  height?: number | string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<ChartJS<T> | null>(null);
  // Kept in a ref so the draw effect doesn't re-run on every parent render:
  // callers build the config inline, so it's a new object each time.
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const c = configRef.current;
    const chart = new ChartJS<T>(canvas, {
      ...c,
      // Cast: merging defaults into Chart.js's deep-partial options is beyond
      // what TS can verify structurally once the chart type is generic.
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        devicePixelRatio: PRINT_PIXEL_RATIO,
        ...c.options,
      } as ChartConfiguration<T>["options"],
    });
    chartRef.current = chart;

    return () => {
      chart.destroy();
      chartRef.current = null;
    };
    // Re-created when the shape of the data changes; see the effect below for
    // in-place updates.
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    // Only the data is refreshed in place. Every widget here builds its
    // options from constants, so re-merging them on each render would be work
    // with no observable effect.
    chart.data = config.data;
    chart.update();
  }, [config]);

  return (
    <div className={className} style={{ height, width: "100%", position: "relative" }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
