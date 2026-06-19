"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { completeOnboardingPassword, type PasswordState } from "@/lib/user-actions";

export default function OnboardingPasswordForm() {
  const [state, action, pending] = useActionState<PasswordState, FormData>(
    completeOnboardingPassword,
    null,
  );

  return (
    <form
      action={action}
      className="rounded-card border border-border/60 bg-surface p-6 shadow-soft"
    >
      <h1 className="text-base font-semibold text-ink">Choisis ton mot de passe</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Pour ta sécurité, définis un mot de passe personnel avant d&apos;accéder à l&apos;application.
      </p>

      <label className="mt-5 block text-xs font-medium text-ink-soft">
        Nouveau mot de passe
      </label>
      <input
        type="password"
        name="next"
        autoComplete="new-password"
        required
        minLength={8}
        className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-brand"
        placeholder="Au moins 8 caractères"
      />

      <label className="mt-4 block text-xs font-medium text-ink-soft">
        Confirme le mot de passe
      </label>
      <input
        type="password"
        name="confirm"
        autoComplete="new-password"
        required
        minLength={8}
        className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-brand"
        placeholder="••••••••"
      />

      {state && !state.ok && (
        <p className="mt-3 rounded-lg bg-negative-soft px-3 py-2 text-xs font-medium text-negative">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
      >
        {pending && <Loader2 size={16} className="animate-spin" />}
        Définir et continuer
      </button>
    </form>
  );
}
