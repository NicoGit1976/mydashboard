import { getValidToken } from "@/lib/connection-tokens";
import { listGa4Properties } from "@/lib/providers/google";
import { listMetaPages } from "@/lib/providers/meta";
import { listLinkedinOrgs } from "@/lib/providers/linkedin";
import { listMatomoSites } from "@/lib/providers/matomo";
import type { AccountOption } from "@/lib/providers/types";

// Lists the selectable accounts/properties/pages/orgs for a connected provider,
// so client attribution can be a dropdown. Returns [] on any error (not
// connected, token expired, API not yet approved) → UI falls back to manual ID.
export async function listProviderAccounts(
  ownerId: string,
  provider: string,
): Promise<AccountOption[]> {
  try {
    const t = await getValidToken(ownerId, provider);
    if (!t) return [];
    if (provider === "ga4") return await listGa4Properties(t.token);
    if (provider === "meta") return await listMetaPages(t.token);
    if (provider === "linkedin") return await listLinkedinOrgs(t.token);
    if (provider === "matomo") return await listMatomoSites(t.token, t.meta);
    return [];
  } catch {
    return [];
  }
}
