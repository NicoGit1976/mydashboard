import * as Lucide from "lucide-react";
import type { ComponentType } from "react";

type IconComp = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
export type IconEntry = { name: string; Icon: IconComp };

// Every Lucide icon (filter out non-icon exports + the "*Icon" aliases to dedupe).
export const ALL_ICONS: IconEntry[] = Object.entries(Lucide)
  .filter(
    ([name, val]) =>
      /^[A-Z]/.test(name) &&
      name !== "Icon" &&
      !name.endsWith("Icon") &&
      (typeof val === "object" || typeof val === "function"),
  )
  .map(([name, val]) => ({ name, Icon: val as IconComp }))
  .sort((a, b) => a.name.localeCompare(b.name));

export function getIconByName(name?: string): IconComp | null {
  if (!name) return null;
  return ALL_ICONS.find((i) => i.name === name)?.Icon ?? null;
}

export function searchIcons(query: string, limit = 64): IconEntry[] {
  const q = query.trim().toLowerCase();
  const list = q ? ALL_ICONS.filter((i) => i.name.toLowerCase().includes(q)) : ALL_ICONS;
  return list.slice(0, limit);
}
