"use client";

import { useActionState } from "react";
import { KeyRound, Loader2, UserPlus } from "lucide-react";
import { createUser, type TeamState } from "@/lib/team-actions";

const inputCls =
  "mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-brand";

// Creates an account and shows the generated temp password ONCE — the new user
// is forced to choose their own at first login.
export default function CreateUserForm() {
  const [state, action, pending] = useActionState<TeamState, FormData>(createUser, null);

  return (
    <form action={action} className="rounded-card border border-border/60 bg-surface p-6 shadow-soft">
      <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
        <UserPlus size={16} className="text-brand" /> Inviter un utilisateur
      </p>
      <p className="mt-0.5 text-xs text-muted">
        Un <strong className="font-medium text-ink-soft">membre</strong> ne voit que les clients
        où on l&apos;invite. Un <strong className="font-medium text-ink-soft">admin</strong> gère
        ses propres clients et choisit qui y accède.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-ink-soft">Identifiant</label>
          <input
            name="username"
            type="text"
            required
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className={inputCls}
            placeholder="prenom.nom"
          />
          <p className="mt-1 text-[11px] text-muted">
            Sert à se connecter. Lettres, chiffres, point, tiret — pas d&apos;arobase.
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-soft">
            Nom <span className="text-muted">(optionnel)</span>
          </label>
          <input name="name" className={inputCls} placeholder="Prénom" />
        </div>
      </div>

      <label className="mt-3 block text-xs font-medium text-ink-soft">Rôle</label>
      <select name="role" defaultValue="MEMBER" className={inputCls + " max-w-56"}>
        <option value="MEMBER">Membre — travaille sur les clients où on l&apos;invite</option>
        <option value="ADMIN">Admin — possède ses propres clients et choisit qui y accède</option>
        <option value="SUPER_ADMIN">Super admin — voit tout, gère les comptes</option>
      </select>

      {state && !state.ok && (
        <p className="mt-3 rounded-lg bg-negative-soft px-3 py-2 text-xs font-medium text-negative">
          {state.message}
        </p>
      )}
      {state?.ok && state.tempPassword && (
        <div className="mt-3 rounded-lg border border-positive/30 bg-positive-soft px-3 py-2.5">
          <p className="text-xs font-semibold text-positive">{state.message}</p>
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-ink">
            <KeyRound size={13} className="text-positive" />
            Mot de passe temporaire :{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px] font-semibold">
              {state.tempPassword}
            </code>
          </p>
          <p className="mt-1 text-[11px] text-ink-soft">
            Transmets-le maintenant — il ne sera plus jamais affiché. Un changement de mot de passe
            sera imposé à la première connexion.
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
      >
        {pending && <Loader2 size={15} className="animate-spin" />}
        Créer le compte
      </button>
    </form>
  );
}
