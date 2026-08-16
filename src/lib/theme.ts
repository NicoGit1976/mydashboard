// Chart palette + style constants, mirrored from the CSS tokens in globals.css.
// (Chart.js needs raw colour strings in JS, so we keep a JS copy here.)
export const CHART_PALETTE = [
  "#4f46e5", // brand / indigo
  "#06b6d4", // accent / cyan
  "#f59e0b", // amber
  "#ec4899", // pink
  "#10b981", // emerald
  "#8b5cf6", // violet
];

export const C = {
  ink: "#1b2030",
  inkSoft: "#565d76",
  muted: "#8b91a7",
  grid: "#eef0f6",
  border: "#e9ebf3",
  brand: "#4f46e5",
  accent: "#06b6d4",
  positive: "#16a34a",
  negative: "#e11d48",
};

// Shared axis styling, in Chart.js's shape. Function-free, so these stay safe
// to import from a server component.
export const tickStyle = { color: C.muted, font: { size: 11 } };
export const gridStyle = { color: C.grid, drawTicks: false };
/** x-axis of a time-ish series: no vertical rules, no tick marks. */
export const categoryAxis = {
  grid: { display: false },
  border: { color: C.border },
  ticks: { ...tickStyle, autoSkip: true, maxTicksLimit: 8 },
};
/** y-axis of a value series: horizontal rules only. */
export const valueAxis = {
  grid: gridStyle,
  border: { display: false },
  ticks: tickStyle,
};
