import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { deleteClient, updateClient } from "@/lib/client-actions";
import { saveClientSource } from "@/lib/client-source-actions";
import { updateReportMeta } from "@/lib/report-actions";
import { getOrCreateReport } from "@/lib/report";
import { listProviderAccounts } from "@/lib/provider-accounts";
import { getConnector } from "@/lib/connectors";
import DeleteClientButton from "@/components/DeleteClientButton";
import { initials } from "@/lib/initials";

const inputCls =
  "mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-brand";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const client = await db.client.findUnique({ where: { id } });
  if (!client || client.ownerId !== session.user.id) notFound();

  const update = updateClient.bind(null, id);
  const remove = deleteClient.bind(null, id);
  const report = await getOrCreateReport(client.id);
  const updateReport = updateReportMeta.bind(null, report.id, id);

  const connections = await db.connection.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: "asc" },
  });
  const bindings = await db.clientSource.findMany({ where: { clientId: id } });
  const bindingByProvider = new Map(bindings.map((b) => [b.provider, b]));

  // For each connected provider, list its accounts/properties so attribution is
  // a dropdown (falls back to manual ID entry if listing is unavailable).
  const accountsByProvider = new Map<string, { id: string; label: string }[]>();
  await Promise.all(
    connections.map(async (conn) => {
      accountsByProvider.set(
        conn.provider,
        await listProviderAccounts(session.user.id, conn.provider),
      );
    }),
  );

  return (
    <div className="mx-auto max-w-xl px-6 py-6">
      <Link
        href={`/clients/${id}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
      >
        <ArrowLeft size={16} /> Retour au rapport
      </Link>

      <h1 className="mt-3 text-xl font-semibold tracking-tight text-ink">
        Réglages du client
      </h1>

      <form
        action={update}
        className="mt-5 rounded-card border border-border/60 bg-surface p-6 shadow-soft"
      >
        <label className="block text-xs font-medium text-ink-soft">Nom du client</label>
        <input name="name" required defaultValue={client.name} className={inputCls} />

        <label className="mt-4 block text-xs font-medium text-ink-soft">
          Secteur <span className="text-muted">(optionnel)</span>
        </label>
        <input name="sector" defaultValue={client.sector ?? ""} className={inputCls} />

        <div className="mt-4 flex items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-ink-soft">Couleur</label>
            <input
              name="brandColor"
              type="color"
              defaultValue={client.brandColor}
              className="mt-1 h-10 w-16 cursor-pointer rounded-lg border border-border bg-white p-1"
            />
          </div>
          <div className="flex items-center gap-3">
            {client.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={client.logoUrl}
                alt={client.name}
                className="h-11 w-11 rounded-xl border border-border object-cover"
              />
            ) : (
              <div
                className="grid h-11 w-11 place-items-center rounded-xl text-sm font-bold text-white"
                style={{ background: client.brandColor }}
              >
                {initials(client.name)}
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-ink-soft">
                Remplacer le logo <span className="text-muted">(optionnel)</span>
              </label>
              <input
                name="logo"
                type="file"
                accept="image/*"
                className="mt-1 text-sm text-ink-soft file:mr-3 file:rounded-md file:border-0 file:bg-brand-soft file:px-2 file:py-1 file:text-xs file:font-medium file:text-brand"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="mt-6 w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          Enregistrer
        </button>
      </form>

      <form
        action={updateReport}
        className="mt-4 rounded-card border border-border/60 bg-surface p-6 shadow-soft"
      >
        <p className="text-sm font-semibold text-ink">Rapport</p>
        <p className="mb-3 mt-0.5 text-xs text-muted">
          Titre et libellés de période affichés en tête du rapport (et sur le lien partagé).
        </p>
        <label className="block text-xs font-medium text-ink-soft">Titre</label>
        <input name="title" defaultValue={report.title} className={inputCls} />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-ink-soft">Période</label>
            <input
              name="periodLabel"
              defaultValue={report.periodLabel ?? ""}
              placeholder="28 derniers jours"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-soft">Comparaison</label>
            <input
              name="compareLabel"
              defaultValue={report.compareLabel ?? ""}
              placeholder="vs 28 jours précédents"
              className={inputCls}
            />
          </div>
        </div>
        <button
          type="submit"
          className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          Enregistrer le rapport
        </button>
      </form>

      <div className="mt-4 rounded-card border border-border/60 bg-surface p-6 shadow-soft">
        <p className="text-sm font-semibold text-ink">Sources de ce client</p>
        <p className="mb-3 mt-0.5 text-xs text-muted">
          Pour chaque compte connecté, indique quelle propriété / page / site correspond à ce client.
        </p>
        {connections.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-bg px-3 py-3 text-xs text-muted">
            Aucun compte connecté. Va dans{" "}
            <span className="font-medium text-ink-soft">Sources de données</span> pour connecter Matomo, GA4, etc.
          </p>
        ) : (
          <div className="space-y-2">
            {connections.map((conn) => {
              const def = getConnector(conn.provider);
              const binding = bindingByProvider.get(conn.provider);
              const accounts = accountsByProvider.get(conn.provider) ?? [];
              return (
                <form
                  key={conn.provider}
                  action={saveClientSource.bind(null, id, conn.provider)}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-white p-2"
                >
                  <span
                    className="inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold text-white"
                    style={{ background: def?.color ?? "#6b7280" }}
                  >
                    {def?.label ?? conn.provider}
                  </span>
                  {accounts.length > 0 ? (
                    <select
                      name="externalId"
                      defaultValue={binding?.externalId ?? ""}
                      className="min-w-[160px] flex-1 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs text-ink outline-none transition-colors focus:border-brand"
                    >
                      <option value="">— Détacher —</option>
                      {/* Keep the saved binding selectable even if it's not in
                          the fresh listing, so an unrelated save can't silently
                          detach it. */}
                      {binding?.externalId &&
                        !accounts.some((a) => a.id === binding.externalId) && (
                          <option value={binding.externalId}>
                            {binding.label || binding.externalId} (actuel)
                          </option>
                        )}
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      name="externalId"
                      defaultValue={binding?.externalId ?? ""}
                      placeholder="ID propriété / page / site"
                      className="min-w-[140px] flex-1 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs text-ink outline-none transition-colors focus:border-brand"
                    />
                  )}
                  <input
                    name="label"
                    defaultValue={binding?.label ?? ""}
                    placeholder="Libellé (optionnel)"
                    className="min-w-[120px] flex-1 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs text-ink outline-none transition-colors focus:border-brand"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
                  >
                    {binding ? "Mettre à jour" : "Enregistrer"}
                  </button>
                </form>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 rounded-card border border-negative/30 bg-surface p-6 shadow-soft">
        <p className="text-sm font-semibold text-ink">Zone de danger</p>
        <p className="mb-3 mt-0.5 text-xs text-muted">
          Supprime le client et tous ses rapports. Irréversible.
        </p>
        <DeleteClientButton action={remove} />
      </div>
    </div>
  );
}
