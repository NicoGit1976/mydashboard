import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { getConnector } from "@/lib/connectors";

export type OAuthCredentials = {
  clientId: string;
  clientSecret: string;
  /** Whose application this is — shown to the user, and worth logging. */
  source: "user" | "instance";
};

/**
 * Which OAuth application to authenticate against, for THIS user.
 *
 * The user's own registration wins; the instance-wide app in the environment
 * is the fallback. Today every user brings their own — the instance app is
 * there for the day this runs under a company that signed the provider's
 * developer terms for its customers.
 */
export async function resolveOAuthCredentials(
  ownerId: string,
  provider: string,
): Promise<OAuthCredentials | null> {
  const own = await db.providerApp.findUnique({
    where: { ownerId_provider: { ownerId, provider } },
  });
  if (own) {
    try {
      return { clientId: own.clientId, clientSecret: decrypt(own.clientSecretEnc), source: "user" };
    } catch {
      // A rotated ENCRYPTION_KEY makes the stored secret unreadable. Fall
      // through to the instance app rather than sending an empty secret the
      // provider would reject with an opaque error.
      console.error(`[provider-apps] secret illisible (owner=${ownerId} provider=${provider})`);
    }
  }

  const def = getConnector(provider);
  if (!def?.oauth) return null;
  const clientId = process.env[def.oauth.clientIdEnv];
  const clientSecret = process.env[def.oauth.clientSecretEnv];
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, source: "instance" };
}

/** Whether this user can start an OAuth flow for a provider at all. */
export async function hasOAuthCredentials(ownerId: string, provider: string): Promise<boolean> {
  return (await resolveOAuthCredentials(ownerId, provider)) !== null;
}

/** Registered apps for a user, without ever returning a secret. */
export async function listProviderApps(
  ownerId: string,
): Promise<{ provider: string; clientId: string; label: string | null }[]> {
  const rows = await db.providerApp.findMany({
    where: { ownerId },
    select: { provider: true, clientId: true, label: true },
    orderBy: { provider: "asc" },
  });
  return rows;
}
