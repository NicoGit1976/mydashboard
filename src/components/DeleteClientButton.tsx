"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

// Two-click confirm (no native confirm() — Chrome suppresses repeats).
export default function DeleteClientButton({
  action,
}: {
  action: () => Promise<void>;
}) {
  const [armed, setArmed] = useState(false);

  return (
    <form action={action}>
      {armed ? (
        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-negative px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
          >
            <Trash2 size={16} /> Confirmer la suppression
          </button>
          <button
            type="button"
            onClick={() => setArmed(false)}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-bg"
          >
            Annuler
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setArmed(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-negative/40 bg-white px-3.5 py-2 text-sm font-semibold text-negative transition-colors hover:bg-negative-soft"
        >
          <Trash2 size={16} /> Supprimer ce client
        </button>
      )}
    </form>
  );
}
