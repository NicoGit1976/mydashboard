"use client";

import { useActionState, useState } from "react";
import { Check, ExternalLink, Plug, TriangleAlert } from "lucide-react";
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
  pasteSteps?: { label: string; url?: string }[];
  afterConnect?: { label: string; url?: string }[];
  appOnly?: string;
};
type Conn = { status: string; url: string | null; account?: string | null } | null;

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
          <>
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
          {def.afterConnect?.length ? (
            <details className="mt-2 rounded-lg bg-bg px-3 py-2">
              <summary className="cursor-pointer text-[11px] font-medium text-ink-soft">
                Rien ne remonte ? Ce qu&apos;il reste à autoriser
              </summary>
              <ol className="mt-1.5 space-y-1">
                {def.afterConnect.map((st, i) => {
                  // The account identity is the value the user must paste on the
                  // provider's side — show it inline rather than making them hunt.
                  const label = st.label.replace("{account}", connection?.account ?? "l'adresse du compte de service");
                  return (
                    <li key={i} className="flex gap-1.5 text-[11px] leading-relaxed">
                      <span className="shrink-0 font-semibold text-muted">{i + 1}.</span>
                      {st.url ? (
                        <a
                          href={st.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex items-start gap-1 font-medium text-brand hover:underline"
                        >
                          {label}
                          <ExternalLink size={10} className="mt-0.5 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-ink-soft">{label}</span>
                      )}
                    </li>
                  );
                })}
              </ol>
              {connection?.account && (
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(connection.account!)}
                  className="mt-1.5 w-full truncate rounded-md bg-white px-2 py-1 text-left font-mono text-[10px] text-ink-soft hover:text-brand"
                  title="Copier"
                >
                  📋 {connection.account}
                </button>
              )}
            </details>
          ) : null}
          </>
        ) : def.tokenFields.length > 0 ? (
          open ? (
            <form action={save} className="space-y-2">
              {(def.pasteHelp || def.pasteSteps?.length) && (
                <div className="rounded-lg bg-bg px-3 py-2">
                  {def.pasteHelp && (
                    <p className="text-[11px] leading-relaxed text-ink-soft">{def.pasteHelp}</p>
                  )}
                  {def.pasteSteps?.length ? (
                    <ol className="mt-1.5 space-y-1">
                      {def.pasteSteps.map((st, i) => (
                        <li key={i} className="flex gap-1.5 text-[11px] leading-relaxed">
                          <span className="shrink-0 font-semibold text-muted">{i + 1}.</span>
                          {st.url ? (
                            <a
                              href={st.url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="inline-flex items-start gap-1 font-medium text-brand hover:underline"
                            >
                              {st.label}
                              <ExternalLink size={10} className="mt-0.5 shrink-0" />
                            </a>
                          ) : (
                            <span className="text-ink-soft">{st.label}</span>
                          )}
                        </li>
                      ))}
                    </ol>
                  ) : null}
                </div>
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
            <div className="space-y-1.5">
              <button
                onClick={() => setOpen(true)}
                className="w-full rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                Connecter
              </button>
              {/* When an OAuth app IS configured, offer the one-click flow as
                  the alternative — otherwise don't mention it at all. */}
              {configured && (
                <a
                  href={`/api/connect/${def.key}`}
                  className="block w-full rounded-lg border border-border px-3 py-2 text-center text-xs font-medium text-ink-soft transition-colors hover:bg-bg"
                >
                  ou se connecter en un clic (OAuth)
                </a>
              )}
            </div>
          )
        ) : configured ? (
          <a
            href={`/api/connect/${def.key}`}
            className="block w-full rounded-lg bg-brand px-3 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Connecter
          </a>
        ) : def.appOnly ? (
          <div className="rounded-lg border border-dashed border-border bg-bg px-3 py-2.5">
            <p className="text-[11px] leading-relaxed text-ink-soft">{def.appOnly}</p>
            <a
              href="https://developers.google.com/my-business/content/prereqs"
              target="_blank"
              rel="noreferrer noopener"
              className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-brand hover:underline"
            >
              Faire la demande d&apos;accès <ExternalLink size={10} />
            </a>
          </div>
        ) : (
          <button
            disabled
            title="Ce connecteur n'a ni app OAuth configurée ni identifiants collables"
            className="w-full cursor-not-allowed rounded-lg border border-dashed border-border bg-bg px-3 py-2 text-sm font-medium text-muted"
          >
            Indisponible
          </button>
        )}
      </div>
    </div>
  );
}
