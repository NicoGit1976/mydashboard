import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { getActor, managedClientsWhere } from "@/lib/access";
import { initials } from "@/lib/initials";

// Approval queue — only posts on clients this actor MANAGES (owner / super
// admin). An assignee can draft and submit, never approve their own post.
export default async function ApprovalsPage() {
  const actor = await getActor();
  if (!actor) redirect("/login");

  const posts = await db.post.findMany({
    where: { status: "PENDING_APPROVAL", client: managedClientsWhere(actor) },
    include: { client: true, author: { select: { name: true, username: true } } },
    orderBy: { submittedAt: "asc" },
  });

  return (
    <div className="mx-auto max-w-[900px] px-6 py-6">
      <Link
        href="/publishing"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
      >
        <ArrowLeft size={16} /> Retour
      </Link>
      <h1 className="mt-3 text-xl font-semibold tracking-tight text-ink">À approuver</h1>
      <p className="mt-1 text-sm text-ink-soft">
        {posts.length === 0
          ? "Rien en attente."
          : `${posts.length} post${posts.length > 1 ? "s" : ""} en attente de ta validation.`}
      </p>

      <div className="mt-5 space-y-2">
        {posts.map((p) => (
          <Link
            key={p.id}
            href={`/publishing/${p.id}`}
            className="flex flex-wrap items-center gap-3 rounded-card border border-border/60 bg-surface p-4 shadow-soft transition-colors hover:border-brand/40"
          >
            <span
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-bold text-white"
              style={{ background: p.client.brandColor }}
            >
              {initials(p.client.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">
                {p.body.slice(0, 90) || "(sans texte)"}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted">
                {p.client.name} · proposé par {p.author?.name ?? p.author?.username ?? "—"}
              </p>
            </div>
            <span className="rounded-full bg-[#fef3e2] px-2 py-0.5 text-[10px] font-semibold text-[#b45309]">
              À valider
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
