import { SOURCES, type SourceKey } from "@/lib/sources";

// Small pill that labels which connector a widget's data came from.
export default function SourceBadge({ source }: { source: SourceKey }) {
  const s = SOURCES[source];
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/70 bg-white px-2 py-0.5 text-[10.5px] font-medium text-ink-soft">
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: s.color }}
      />
      {s.label}
    </span>
  );
}
