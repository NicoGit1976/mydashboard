"use client";

import { useActionState } from "react";
import { setClientAssignees, type AssignState } from "@/lib/assignment-actions";

type Person = { id: string; username: string | null; name: string | null; role: string };

// Who else may work on this client. Checkboxes rather than a multi-select:
// the current state has to be readable at a glance, since it decides who sees
// the client at all.
export default function AssigneesForm({
  clientId,
  people,
  assigned,
}: {
  clientId: string;
  people: Person[];
  assigned: string[];
}) {
  const action = setClientAssignees.bind(null, clientId);
  const [state, formAction, pending] = useActionState<AssignState, FormData>(
    action,
    null,
  );

  if (people.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-bg px-3 py-3 text-xs text-muted">
        Aucun autre compte pour l&apos;instant. Crée des comptes dans{" "}
        <span className="font-medium text-ink-soft">Équipe</span> pour pouvoir leur
        confier ce client.
      </p>
    );
  }

  return (
    <form action={formAction}>
      <div className="space-y-1.5">
        {people.map((p) => (
          <label
            key={p.id}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-white px-3 py-2 text-xs transition-colors hover:border-brand/40"
          >
            <input
              type="checkbox"
              name="userIds"
              value={p.id}
              defaultChecked={assigned.includes(p.id)}
              className="h-4 w-4 accent-[var(--color-brand,#4f46e5)]"
            />
            <span className="font-medium text-ink">{p.name ?? p.username}</span>
            <span className="text-muted">{p.username}</span>
            <span className="ml-auto rounded-full bg-bg px-2 py-0.5 text-[10px] font-medium text-muted">
              {p.role === "SUPER_ADMIN"
                ? "Super admin"
                : p.role === "ADMIN"
                  ? "Admin"
                  : "Membre"}
            </span>
          </label>
        ))}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-3 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Enregistrement…" : "Enregistrer les accès"}
      </button>

      {state && (
        <p
          className={`mt-2 text-[11px] font-medium ${
            state.ok ? "text-positive" : "text-negative"
          }`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
