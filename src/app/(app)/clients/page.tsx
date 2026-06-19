import Link from "next/link";
import { Plus } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { initials } from "@/lib/initials";

export default async function ClientsPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const clients = userId
    ? await db.client.findMany({
        where: { ownerId: userId },
        orderBy: { createdAt: "asc" },
      })
    : [];

  return (
    <div className="mx-auto max-w-[1180px] px-6 py-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Clients</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {clients.length} client{clients.length > 1 ? "s" : ""} — tu ne vois que les tiens (cloisonné).
          </p>
        </div>
        <Link
          href="/clients/new"
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          <Plus size={16} /> Nouveau client
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-12 gap-4">
        {clients.map((c) => (
          <Link
            key={c.id}
            href={`/clients/${c.id}`}
            className="col-span-12 flex items-center gap-3 rounded-card border border-border/60 bg-surface p-4 shadow-soft transition-colors hover:border-brand/40 sm:col-span-6 lg:col-span-4"
          >
            {c.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.logoUrl}
                alt={c.name}
                className="h-11 w-11 shrink-0 rounded-xl border border-border object-cover"
              />
            ) : (
              <div
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-sm font-bold text-white"
                style={{ background: c.brandColor }}
              >
                {initials(c.name)}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{c.name}</p>
              <p className="truncate text-xs text-muted">{c.sector ?? "—"}</p>
            </div>
          </Link>
        ))}

        {clients.length === 0 && (
          <Link
            href="/clients/new"
            className="col-span-12 flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-border bg-surface p-8 text-center text-sm text-muted transition-colors hover:border-brand/40"
          >
            <Plus size={20} className="text-brand" />
            Crée ton premier client.
          </Link>
        )}
      </div>
    </div>
  );
}
