"use client";

import { useActionState } from "react";
import { changePassword, type PasswordState } from "@/lib/user-actions";

const inputCls =
  "mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-brand";

export default function ChangePasswordForm() {
  const [state, action, pending] = useActionState<PasswordState, FormData>(
    changePassword,
    null,
  );

  return (
    <form action={action}>
      <label className="block text-xs font-medium text-ink-soft">Mot de passe actuel</label>
      <input name="current" type="password" required autoComplete="current-password" className={inputCls} />

      <label className="mt-4 block text-xs font-medium text-ink-soft">Nouveau mot de passe</label>
      <input name="next" type="password" required autoComplete="new-password" className={inputCls} />

      {state && (
        <p
          className={`mt-3 rounded-lg px-3 py-2 text-xs font-medium ${
            state.ok ? "bg-positive-soft text-positive" : "bg-negative-soft text-negative"
          }`}
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Mise à jour…" : "Changer le mot de passe"}
      </button>
    </form>
  );
}
