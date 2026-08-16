import type { ReactNode } from "react";
import SourceBadge from "@/components/report/SourceBadge";
import type { SourceKey } from "@/lib/sources";

// Standard chrome around every report widget: title, optional subtitle, optional
// source badge. The grid placement (col-span) is passed via className.
export default function WidgetCard({
  title,
  subtitle,
  source,
  demo = false,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  source?: SourceKey;
  /** No connected source fills this widget — its figures are sample values. */
  demo?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`flex flex-col rounded-card border border-border/60 bg-surface shadow-soft ${className ?? ""}`}
    >
      <header className="flex items-start justify-between gap-3 px-5 pb-3 pt-4">
        <div className="min-w-0">
          <h3 className="truncate text-[13px] font-semibold tracking-tight text-ink">
            {title}
          </h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
        </div>
        <span className="flex shrink-0 items-center gap-1.5">
          {demo && (
            <span
              title="Chiffres de démonstration — aucune source branchée ne les alimente"
              className="rounded-full bg-bg px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted"
            >
              démo
            </span>
          )}
          {source && <SourceBadge source={source} />}
        </span>
      </header>
      <div className="flex-1 px-5 pb-5">{children}</div>
    </section>
  );
}
