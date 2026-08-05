import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { getActor, visibleClientsWhere } from "@/lib/access";
import { listPublishCandidates } from "@/lib/publish-targets";
import Composer from "@/components/publishing/Composer";

// New post. The client is picked first (its bound pages define the possible
// destinations), so ?client= drives the whole form.
export default async function NewPostPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await getActor();
  if (!actor) redirect("/login");
  const sp = await searchParams;

  const clients = await db.client.findMany({
    where: visibleClientsWhere(actor),
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  if (clients.length === 0) redirect("/clients");

  const clientId = sp.client && clients.some((c) => c.id === sp.client) ? sp.client : clients[0].id;
  const candidates = await listPublishCandidates(clientId);

  return (
    <div className="mx-auto max-w-2xl px-6 py-6">
      <Link
        href="/publishing"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
      >
        <ArrowLeft size={16} /> Retour
      </Link>
      <h1 className="mt-3 text-xl font-semibold tracking-tight text-ink">Nouveau post</h1>

      {clients.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {clients.map((c) => (
            <Link
              key={c.id}
              href={`/publishing/new?client=${c.id}`}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                c.id === clientId
                  ? "border-brand bg-brand-soft text-brand"
                  : "border-border bg-white text-ink-soft hover:bg-bg"
              }`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-4">
        <Composer clientId={clientId} candidates={candidates} />
      </div>
    </div>
  );
}
