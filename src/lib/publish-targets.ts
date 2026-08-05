import { db } from "@/lib/db";

// Derives the publishable destinations for one client — there is NO
// destinations table. A destination is (connectionId, provider, externalId):
//   meta_fb / meta_ig / gmb : from the client's ClientSource bindings
//                             (resolved against the binding's connection);
//   linkedin / x            : personal accounts — every connection held by the
//                             client's owner or an assignee is a candidate
//                             ("publishing in <name>'s name" is explicit in UI).

export type PublishCandidate = {
  key: string; // `${connectionId}:${provider}:${externalId}` — the composer selection unit
  provider: string; // linkedin | meta_fb | meta_ig | x | gmb
  externalId: string;
  connectionId: string;
  label: string;
  connectionStatus: string;
};

export const PUBLISHABLE_PROVIDERS = ["linkedin", "meta_fb", "meta_ig", "x", "gmb"] as const;

// Per-network compose limits, enforced client-side (counters) AND server-side.
export const NETWORK_LIMITS: Record<
  string,
  { maxChars: number; maxImages: number; requiresImage?: boolean; urlWeight?: number }
> = {
  linkedin: { maxChars: 3000, maxImages: 1 },
  meta_fb: { maxChars: 60000, maxImages: 1 },
  meta_ig: { maxChars: 2200, maxImages: 1, requiresImage: true },
  // Every URL counts as 23 chars on X (t.co wrapping).
  x: { maxChars: 280, maxImages: 0, urlWeight: 23 },
  gmb: { maxChars: 1500, maxImages: 1 },
};

export function candidateKey(c: { connectionId: string; provider: string; externalId: string }) {
  return `${c.connectionId}:${c.provider}:${c.externalId}`;
}

export async function listPublishCandidates(clientId: string): Promise<PublishCandidate[]> {
  const client = await db.client.findUnique({
    where: { id: clientId },
    include: { assignments: { select: { userId: true } } },
  });
  if (!client) return [];

  const out: PublishCandidate[] = [];

  // Page/location destinations come from the client's own source bindings.
  const bindings = await db.clientSource.findMany({
    where: { clientId, provider: { in: ["meta", "gmb"] } },
    include: { connection: true },
  });
  for (const b of bindings) {
    const conn =
      b.connection ??
      (await db.connection.findUnique({
        where: { ownerId_provider: { ownerId: client.ownerId, provider: b.provider } },
      }));
    if (!conn) continue;
    const label = b.label || b.externalId;
    if (b.provider === "meta") {
      out.push({
        key: `${conn.id}:meta_fb:${b.externalId}`,
        provider: "meta_fb",
        externalId: b.externalId,
        connectionId: conn.id,
        label: `Page Facebook — ${label}`,
        connectionStatus: conn.status,
      });
      out.push({
        key: `${conn.id}:meta_ig:${b.externalId}`,
        provider: "meta_ig",
        externalId: b.externalId,
        connectionId: conn.id,
        label: `Instagram — ${label}`,
        connectionStatus: conn.status,
      });
    } else if (b.provider === "gmb") {
      out.push({
        key: `${conn.id}:gmb:${b.externalId}`,
        provider: "gmb",
        externalId: b.externalId,
        connectionId: conn.id,
        label: `Fiche Google — ${label}`,
        connectionStatus: conn.status,
      });
    }
  }

  // Personal destinations: owner + assignees' LinkedIn / X connections.
  const memberIds = [client.ownerId, ...client.assignments.map((a) => a.userId)];
  const personal = await db.connection.findMany({
    where: { ownerId: { in: memberIds }, provider: { in: ["linkedin", "x"] } },
    include: { owner: { select: { name: true, username: true } } },
  });
  for (const conn of personal) {
    const who = conn.owner.name ?? conn.owner.username ?? "compte";
    const meta = (conn.meta ?? {}) as Record<string, unknown>;
    const externalId = String(meta.memberUrn ?? meta.userId ?? "");
    // No identity ⇒ no destination. A literal "self" would be an undeliverable
    // target, and two members would collide on @@unique([postId,provider,externalId]).
    if (!externalId) continue;
    out.push({
      key: `${conn.id}:${conn.provider}:${externalId}`,
      provider: conn.provider,
      externalId,
      connectionId: conn.id,
      label:
        conn.provider === "linkedin"
          ? `Profil LinkedIn — ${conn.accountLabel ?? who}`
          : `X — ${conn.accountLabel ?? who}`,
      connectionStatus: conn.status,
    });
  }

  return out;
}

// Effective character count for a network (X wraps every URL to 23 chars).
export function effectiveLength(text: string, provider: string): number {
  const w = NETWORK_LIMITS[provider]?.urlWeight;
  if (!w) return text.length;
  return text.replace(/https?:\/\/\S+/g, "x".repeat(w)).length;
}
