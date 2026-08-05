import { POST_STATUS, TARGET_STATUS } from "@/lib/post-status";

export function PostStatusBadge({ status }: { status: string }) {
  const s = POST_STATUS[status] ?? { label: status, cls: "bg-bg text-muted" };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
}

export function TargetStatusBadge({ status }: { status: string }) {
  const s = TARGET_STATUS[status] ?? { label: status, cls: "bg-bg text-muted" };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
}
