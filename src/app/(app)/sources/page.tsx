import { auth } from "@/auth";
import { db } from "@/lib/db";
import { CONNECTORS, isConfigured } from "@/lib/connectors";
import ConnectorCard from "@/components/sources/ConnectorCard";

const ERROR_MESSAGES: Record<string, string> = {
  notconfigured:
    "Ce connecteur n'est pas encore configuré : il attend soit une app OAuth, soit des identifiants à coller.",
  state: "Échec de la vérification de sécurité OAuth. Réessaie.",
  token: "Le fournisseur a refusé l'échange de jeton.",
  exchange: "Erreur réseau pendant l'échange OAuth.",
  unknown: "Connecteur inconnu.",
};

export default async function SourcesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const userId = session?.user?.id;
  const connections = userId
    ? await db.connection.findMany({ where: { ownerId: userId } })
    : [];
  const byProvider = new Map(connections.map((c) => [c.provider, c]));

  return (
    <div className="mx-auto max-w-[1180px] px-6 py-6">
      <h1 className="text-xl font-semibold tracking-tight text-ink">Sources de données</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Connecte tes comptes — jamais ton mot de passe : connexion OAuth officielle ou jeton d'API.
      </p>

      {sp.connected && (
        <p className="mt-4 rounded-lg bg-positive-soft px-3 py-2 text-sm font-medium text-positive">
          Source connectée : {sp.connected}.
        </p>
      )}
      {sp.error && (
        <p className="mt-4 rounded-lg bg-negative-soft px-3 py-2 text-sm font-medium text-negative">
          {ERROR_MESSAGES[sp.error] ?? "Une erreur est survenue."}
          {sp.p ? ` (${sp.p})` : ""}
        </p>
      )}

      <div className="mt-5 grid grid-cols-12 gap-4">
        {CONNECTORS.map((c) => {
          const conn = byProvider.get(c.key);
          const meta = (conn?.meta ?? null) as Record<string, string> | null;
          return (
            <ConnectorCard
              key={c.key}
              def={{
                key: c.key,
                label: c.label,
                color: c.color,
                authType: c.authType,
                difficulty: c.difficulty,
                description: c.description,
                tokenFields: c.tokenFields ?? [],
                pasteHelp: c.pasteHelp,
                appOnly: c.appOnly,
              }}
              // "Configured" now means: connectable by SOME route — an OAuth app
              // in the env, or a credential the operator can paste.
              configured={isConfigured(c) || (c.tokenFields?.length ?? 0) > 0}
              connection={conn ? { status: conn.status, url: meta?.url ?? null } : null}
            />
          );
        })}
      </div>
    </div>
  );
}
