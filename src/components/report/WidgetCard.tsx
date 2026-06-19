import type { ReactNode } from "react";
import SourceBadge from "@/components/report/SourceBadge";
import type { SourceKey } from "@/lib/sources";

// Standard chrome around every report widget: title, optional subtitle, optional
// source badge. The grid placement (col-span) is passed via className.
export default function WidgetCard({
  title,
  subtitle,
  source,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  source?: SourceKey;
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
        {source && <SourceBadge source={source} />}
      </header>
      <div className="flex-1 px-5 pb-5">{children}</div>
    </section>
  );
}
