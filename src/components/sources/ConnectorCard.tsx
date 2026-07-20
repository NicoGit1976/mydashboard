"use client";

import { useActionState, useState } from "react";
import { Check, Plug, TriangleAlert } from "lucide-react";
import {
  disconnectProvider,
  saveTokenConnection,
  type ConnectState,
} from "@/lib/connection-actions";

type TokenField = {
  name: string;
  label: string;
  placeholder?: string;
  type?: string;
  multiline?: boolean;
  help?: string;
};
type Def = {
  key: string;
  label: string;
  color: string;
  authType: "oauth" | "token";
  difficulty: "easy" | "medium" | "hard";
  description: string;
  tokenFields: TokenField[];
  pasteHelp?: string;
  appOnly?: string;
};
type Conn = { status: string; url: string | null } | null;

const DIFF: Record<string, { label: string; cls: string }> = {
  easy: { label: "Facile", cls: "bg-positive-soft text-positive" },
  medium: { label: "Moyen", cls: "bg-[#fef3e2] text-[#b45309]" },
  hard: { label: "Avancé", cls: "bg-negative-soft text-negative" },
};

export default function ConnectorCard({
  def,
  configured,
  connection,
}: {
  def: Def;
  configured: boolean;
  connection: Conn;
}) {
  const [open, setOpen] = useState(false);
  const connected = !!connection;
  const [state, save, pending] = useActionState<ConnectState, FormData>(
    saveTokenConnection.bind(null, def.key),
    null,
  );
  const disconnect = disconnectProvider.bind(null, def.key);

  return (
    <div className="col-span-12 flex flex-col rounded-card border border-border/60 bg-surface p-5 shadow-soft sm:col-span-6 lg:col-span-4">
      <div className="flex items-center gap-3">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white"
          style={{ background: def.color }}
        >
          <Plug size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-ink">{def.label}</p>
            <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${DIFF[def.difficulty].cls}`}>
              {DIFF[def.difficulty].label}
            </span>
          </div>
        </div>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-muted">{def.description}</p>

      <div className="mt-auto pt-4">
        {connected ? (
          <div className="flex items-center justify-between gap-2">
            {connection!.status === "error" ? (
              <span
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-negative"
                title="Le jeton a expiré ou n'est plus valide — reconnecte la source."
              >
                <TriangleAlert size={14} /> À reconnecter
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-positive">
                <Check size={14} /> Connecté
              </span>
            )}
            <form action={disconnect}>
              <button className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:bg-bg">
                Déconnecter
              </button>
            </form>
          </div>
        ) : def.tokenFields.length > 0 ? (
          open ? (
            <form action={save} className="space-y-2">
              {def.pasteHelp && (
                <p className="rounded-lg bg-bg px-3 py-2 text-[11px] leading-relaxed text-ink-soft">
                  {def.pasteHelp}
                </p>
              )}
              {def.tokenFields.map((f) => (
                <div key={f.name}>
                  <label className="block text-[11px] font-medium text-ink-soft">{f.label}</label>
                  {/* A private key is multi-line: a single-line input makes it
                      practically impossible to paste and check. */}
                  {f.multiline ? (
                    <textarea
                      name={f.name}
                      rows={4}
                      placeholder={f.placeholder ?? f.label}
                      required={f.name === "token"}
                      spellCheck={false}
                      className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 font-mono text-[11px] text-ink outline-none transition-colors focus:border-brand"
                    />
                  ) : (
                    <input
                      name={f.name}
                      type={f.type ?? "text"}
                      placeholder={f.placeholder ?? f.label}
                      required={f.name === "token"}
                      spellCheck={false}
                      className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-xs text-ink outline-none transition-colors focus:border-brand"
                    />
                  )}
                  {f.help && <p className="mt-0.5 text-[10px] text-muted">{f.help}</p>}
                </div>
              ))}
              {state && (
                <p
                  className={`text-[11px] font-medium ${
                    state.ok ? "text-positive" : "text-negative"
                  }`}
                >
                  {state.message}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="flex-1 rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
                >
                  {pending ? "Vérification…" : "Connecter"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-ink-soft transition-colors hover:bg-bg"
                >
                  Annuler
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setOpen(true)}
              className="w-full rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              Connecter
            </button>
          )
        ) : configured ? (
          <a
            href={`/api/connect/${def.key}`}
            className="block w-full rounded-lg bg-brand px-3 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Connecter
          </a>
        ) : (
          <button
            disabled
            title="Ajoute les identifiants OAuth de ce fournisseur dans .env"
            className="w-full cursor-not-allowed rounded-lg border border-dashed border-border bg-bg px-3 py-2 text-sm font-medium text-muted"
          >
            À configurer (OAuth)
          </button>
        )}
      </div>
    </div>
  );
}
