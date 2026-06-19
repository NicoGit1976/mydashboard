// Chart palette + style constants, mirrored from the CSS tokens in globals.css.
// (ECharts needs raw color strings in JS, so we keep a JS copy here.)
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

// Reusable (function-free, so safe to import into server or client components).
export const splitLine = { lineStyle: { color: C.grid } };
export const axisLabelStyle = { color: C.muted, fontSize: 11 };
export const axisLineStyle = { lineStyle: { color: C.border } };
