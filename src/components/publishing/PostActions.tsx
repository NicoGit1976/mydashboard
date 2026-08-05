"use client";

import { useActionState, useState, useTransition } from "react";
import {
  approvePost,
  cancelPost,
  deletePost,
  rejectPost,
  retryPostTarget,
  submitPost,
  type PublishState,
} from "@/lib/publishing-actions";

function Msg({ state }: { state: PublishState }) {
  if (!state) return null;
  return (
    <p className={`mt-2 text-[11px] font-medium ${state.ok ? "text-positive" : "text-negative"}`}>
      {state.message}
    </p>
  );
}

export function SubmitForApproval({ postId }: { postId: string }) {
  const [state, setState] = useState<PublishState>(null);
  const [pending, start] = useTransition();
  return (
    <div>
      <button
        onClick={() => start(async () => setState(await submitPost(postId)))}
        disabled={pending}
        className="rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Envoi…" : "Soumettre pour approbation"}
      </button>
      <Msg state={state} />
    </div>
  );
}

// Approve / reject share one note field: a refusal without a reason is useless
// to the author, so the server requires it.
export function ApprovalActions({ postId }: { postId: string }) {
  const [approveState, approveAction, approving] = useActionState<PublishState, FormData>(
    approvePost.bind(null, postId),
    null,
  );
  const [rejectState, rejectAction, rejecting] = useActionState<PublishState, FormData>(
    rejectPost.bind(null, postId),
    null,
  );
  return (
    <div className="rounded-card border border-border/60 bg-surface p-5 shadow-soft">
      <p className="text-sm font-semibold text-ink">Approbation</p>
      <p className="mb-3 mt-0.5 text-xs text-muted">
        Approuver déclenche la publication (à l&apos;heure choisie, sinon dans la minute).
      </p>
      <form action={approveAction} className="space-y-2">
        <textarea
          name="note"
          rows={2}
          placeholder="Note (facultative si tu approuves, obligatoire si tu refuses)"
          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-xs text-ink outline-none focus:border-brand"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={approving || rejecting}
            className="rounded-lg bg-positive px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {approving ? "Approbation…" : "Approuver et publier"}
          </button>
          <button
            type="submit"
            formAction={rejectAction}
            disabled={approving || rejecting}
            className="rounded-lg border border-negative/40 px-3 py-2 text-xs font-semibold text-negative transition-colors hover:bg-negative-soft disabled:opacity-60"
          >
            {rejecting ? "Refus…" : "Refuser"}
          </button>
        </div>
      </form>
      <Msg state={approveState ?? rejectState} />
    </div>
  );
}

export function RetryTargetButton({ targetId }: { targetId: string }) {
  const [state, setState] = useState<PublishState>(null);
  const [pending, start] = useTransition();
  return (
    <span>
      <button
        onClick={() => start(async () => setState(await retryPostTarget(targetId)))}
        disabled={pending}
        className="rounded-md border border-border px-2 py-1 text-[10px] font-medium text-ink-soft transition-colors hover:bg-bg disabled:opacity-60"
      >
        {pending ? "…" : "Réessayer"}
      </button>
      {state && !state.ok && (
        <span className="ml-2 text-[10px] font-medium text-negative">{state.message}</span>
      )}
    </span>
  );
}

export function CancelPostButton({ postId }: { postId: string }) {
  const [state, setState] = useState<PublishState>(null);
  const [pending, start] = useTransition();
  return (
    <div>
      <button
        onClick={() => start(async () => setState(await cancelPost(postId)))}
        disabled={pending}
        className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-ink-soft transition-colors hover:bg-bg disabled:opacity-60"
      >
        {pending ? "…" : "Annuler la publication"}
      </button>
      <Msg state={state} />
    </div>
  );
}

// Two-click delete, and it says plainly what deletion does NOT do.
export function DeletePostButton({ postId }: { postId: string }) {
  const [armed, setArmed] = useState(false);
  const [state, setState] = useState<PublishState>(null);
  const [pending, start] = useTransition();
  return (
    <div>
      <button
        onClick={() =>
          armed
            ? start(async () => setState((await deletePost(postId)) ?? null))
            : setArmed(true)
        }
        disabled={pending}
        className="rounded-lg border border-negative/40 px-3 py-2 text-xs font-semibold text-negative transition-colors hover:bg-negative-soft disabled:opacity-60"
      >
        {pending ? "Suppression…" : armed ? "Confirmer la suppression" : "Supprimer"}
      </button>
      {armed && (
        <p className="mt-1 text-[11px] text-muted">
          Ne supprime pas les publications déjà parues sur les réseaux.
        </p>
      )}
      <Msg state={state} />
    </div>
  );
}
