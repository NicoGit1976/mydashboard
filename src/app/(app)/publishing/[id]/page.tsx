import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getActor, getPostClientFor } from "@/lib/access";
import { NETWORK_COLOR, NETWORK_LABEL } from "@/lib/post-status";
import { PostStatusBadge, TargetStatusBadge } from "@/components/publishing/PostStatusBadge";
import {
  ApprovalActions,
  CancelPostButton,
  DeletePostButton,
  RetryTargetButton,
  SubmitForApproval,
} from "@/components/publishing/PostActions";
import Composer, { type Candidate } from "@/components/publishing/Composer";
import { listPublishCandidates } from "@/lib/publish-targets";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await getActor();
  if (!actor) redirect("/login");

  const found = await getPostClientFor(actor, id, "view");
  if (!found) notFound();
  const { post, client } = found;

  const canManage = client.ownerId === actor.id || actor.role === "SUPER_ADMIN";
  const editable = post.status === "DRAFT" || post.status === "PENDING_APPROVAL";
  const candidates: Candidate[] = editable ? await listPublishCandidates(client.id) : [];
  const media = Array.isArray(post.media) ? (post.media as string[]) : [];
  const targetKeys = Array.isArray(post.targetKeys) ? (post.targetKeys as string[]) : [];

  return (
    <div className="mx-auto max-w-2xl px-6 py-6">
      <Link
        href="/publishing"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
      >
        <ArrowLeft size={16} /> Retour
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold tracking-tight text-ink">{client.name}</h1>
        <PostStatusBadge status={post.status} />
      </div>

      {post.reviewNote && (
        <p className="mt-3 rounded-lg bg-[#fef3e2] px-3 py-2 text-xs text-[#b45309]">
          <strong className="font-semibold">Note :</strong> {post.reviewNote}
        </p>
      )}

      {editable ? (
        <div className="mt-4">
          <Composer
            clientId={client.id}
            postId={post.id}
            candidates={candidates}
            initial={{
              body: post.body,
              scheduledAt: post.scheduledAt
                ? new Date(post.scheduledAt).toISOString().slice(0, 16)
                : null,
              targetKeys,
              media,
            }}
          />
        </div>
      ) : (
        <div className="mt-4 rounded-card border border-border/60 bg-surface p-5 shadow-soft">
          <p className="whitespace-pre-wrap text-sm text-ink">{post.body}</p>
          {media[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={media[0]}
              alt=""
              className="mt-3 max-h-64 rounded-lg border border-border object-contain"
            />
          )}
        </div>
      )}

      {post.targets.length > 0 && (
        <div className="mt-4 rounded-card border border-border/60 bg-surface p-5 shadow-soft">
          <p className="text-sm font-semibold text-ink">Destinations</p>
          <div className="mt-2 space-y-1.5">
            {post.targets.map((t) => (
              <div
                key={t.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-white px-3 py-2"
              >
                <span
                  className="inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-white"
                  style={{ background: NETWORK_COLOR[t.provider] ?? "#6b7280" }}
                >
                  {NETWORK_LABEL[t.provider] ?? t.provider}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink">
                  {t.label}
                </span>
                <TargetStatusBadge status={t.status} />
                {t.publishedUrl && (
                  <a
                    href={t.publishedUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-brand hover:underline"
                  >
                    Voir <ExternalLink size={11} />
                  </a>
                )}
                {t.status === "failed" && <RetryTargetButton targetId={t.id} />}
                {t.lastError && (
                  <p className="w-full text-[11px] text-negative">{t.lastError}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {post.status === "DRAFT" && !canManage && <SubmitForApproval postId={post.id} />}
        {post.status === "DRAFT" && canManage && (
          <>
            <SubmitForApproval postId={post.id} />
            <ApprovalActions postId={post.id} />
          </>
        )}
        {post.status === "PENDING_APPROVAL" && canManage && <ApprovalActions postId={post.id} />}
        {post.status === "PENDING_APPROVAL" && !canManage && (
          <p className="text-xs text-muted">
            En attente de validation par le responsable de ce client.
          </p>
        )}
        {post.status === "SCHEDULED" && <CancelPostButton postId={post.id} />}
        {post.status !== "PUBLISHING" && <DeletePostButton postId={post.id} />}
      </div>
    </div>
  );
}
