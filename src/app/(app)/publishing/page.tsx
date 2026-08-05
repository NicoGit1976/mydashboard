import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Send } from "lucide-react";
import { db } from "@/lib/db";
import { getActor, managedClientsWhere, visibleClientsWhere } from "@/lib/access";
import { initials } from "@/lib/initials";
import { PostStatusBadge } from "@/components/publishing/PostStatusBadge";
import { NETWORK_LABEL } from "@/lib/post-status";

// Publishing home: what's coming, what's waiting, what failed.
export default async function PublishingPage() {
  const actor = await getActor();
  if (!actor) redirect("/login");

  const clients = await db.client.findMany({
    where: visibleClientsWhere(actor),
    orderBy: { name: "asc" },
    select: { id: true, name: true, brandColor: true },
  });

  const posts = await db.post.findMany({
    where: { client: visibleClientsWhere(actor) },
    include: { client: true, targets: true },
    orderBy: [{ scheduledAt: "desc" }, { createdAt: "desc" }],
    take: 50,
  });

  const pendingCount = await db.post.count({
    where: { status: "PENDING_APPROVAL", client: managedClientsWhere(actor) },
  });

  return (
    <div className="mx-auto max-w-[1180px] px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Publication</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Rédige une fois, publie sur plusieurs réseaux — avec validation avant parution.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Link
              href="/publishing/approvals"
              className="rounded-lg border border-[#f6c88a] bg-[#fef3e2] px-3 py-2 text-sm font-semibold text-[#b45309] transition-colors hover:brightness-95"
            >
              À approuver ({pendingCount})
            </Link>
          )}
          {clients.length > 0 && (
            <Link
              href="/publishing/new"
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              <Plus size={16} /> Nouveau post
            </Link>
          )}
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="mt-6 rounded-card border border-dashed border-border bg-surface p-10 text-center shadow-soft">
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand">
            <Send size={20} />
          </span>
          <p className="mt-3 text-sm font-medium text-ink">Aucun post pour l&apos;instant</p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted">
            Rédige un brouillon dès maintenant : il attendra sagement que les comptes réseaux
            soient connectés dans <span className="font-medium text-ink-soft">Sources de données</span>.
          </p>
          {clients.length > 0 && (
            <Link
              href="/publishing/new"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              <Plus size={16} /> Écrire un post
            </Link>
          )}
        </div>
      ) : (
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
                  {p.client.name}
                  {p.scheduledAt
                    ? ` · ${new Date(p.scheduledAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}`
                    : ""}
                  {p.targets.length > 0
                    ? ` · ${p.targets.map((t) => NETWORK_LABEL[t.provider] ?? t.provider).join(", ")}`
                    : ""}
                </p>
              </div>
              <PostStatusBadge status={p.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
