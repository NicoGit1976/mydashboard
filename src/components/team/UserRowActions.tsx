"use client";

import { useState, useTransition } from "react";
import { KeyRound, Loader2, Trash2 } from "lucide-react";
import { deleteUser, resetUserPassword, type TeamState } from "@/lib/team-actions";

// Per-user actions: reset password (temp shown once) + two-click delete.
export default function UserRowActions({ userId }: { userId: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<TeamState>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function onReset() {
    startTransition(async () => setResult(await resetUserPassword(userId)));
  }

  function onDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3500);
      return;
    }
    startTransition(async () => setResult(await deleteUser(userId)));
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-1.5">
        <button
          onClick={onReset}
          disabled={pending}
          title="Réinitialiser le mot de passe"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:bg-bg disabled:opacity-60"
        >
          {pending ? <Loader2 size={13} className="animate-spin" /> : <KeyRound size={13} />}
          Réinitialiser
        </button>
        <button
          onClick={onDelete}
          disabled={pending}
          title="Supprimer le compte"
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${
            confirmDelete
              ? "bg-negative text-white hover:opacity-90"
              : "border border-negative/30 bg-white text-negative hover:bg-negative-soft"
          }`}
        >
          <Trash2 size={13} />
          {confirmDelete ? "Confirmer ?" : "Supprimer"}
        </button>
      </div>

      {result && !result.ok && (
        <p className="text-[11px] font-medium text-negative">{result.message}</p>
      )}
      {result?.ok && result.tempPassword && (
        <p className="rounded-lg bg-positive-soft px-2 py-1 text-[11px] text-ink">
          Nouveau mot de passe temporaire :{" "}
          <code className="rounded bg-white px-1 py-0.5 font-mono text-[10px] font-semibold">
            {result.tempPassword}
          </code>
        </p>
      )}
    </div>
  );
}
