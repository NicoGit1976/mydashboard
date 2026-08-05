// Common contract for every network publisher.
//
// A publisher NEVER throws for a network outcome — it returns a PublishResult.
// The scheduler maps `kind` to a decision:
//   auth      → target failed + Connection.status="error" (dead token, stop)
//   permission→ target failed, connection stays connected (missing right/role)
//   rate      → re-park at retryAfterSec (attempt NOT consumed when provided)
//   transient → backoff retry (5xx, timeout, network)
//   permanent → target failed (bad request, duplicate, policy)

export type PublishDestination = {
  provider: string; // linkedin | meta_fb | meta_ig | x | gmb
  externalId: string;
  label: string;
  token: string;
  meta: Record<string, unknown>;
};

export type PublishInput = {
  body: string;
  media: string[]; // "/api/uploads/<uuid>.<ext>" paths
};

export type PublishResult =
  | { ok: true; externalPostId: string; publishedUrl?: string }
  | {
      ok: false;
      kind: "auth" | "permission" | "rate" | "transient" | "permanent";
      message: string; // French, shown verbatim in the UI
      retryAfterSec?: number;
    };

export type Publisher = (
  dest: PublishDestination,
  input: PublishInput,
) => Promise<PublishResult>;
