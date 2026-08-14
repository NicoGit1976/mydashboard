"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  AlertCircle,
  ArrowUp,
  Check,
  FileText,
  Loader2,
  Medal,
  Plus,
  RotateCcw,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { askInsight, insertInsight } from "@/lib/ai-actions";

type Intent = { key: string; label: string; hint: string; Icon: typeof FileText };

const INTENTS: Intent[] = [
  {
    key: "summary",
    label: "Synthèse",
    hint: "Vue d'ensemble neutre des indicateurs et des tendances.",
    Icon: FileText,
  },
  {
    key: "opportunities",
    label: "Opportunités",
    hint: "Actions concrètes pour améliorer les résultats.",
    Icon: Target,
  },
  {
    key: "wins",
    label: "Réussites",
    hint: "Ce qui a bien fonctionné sur la période.",
    Icon: Medal,
  },
  {
    key: "issues",
    label: "Points de vigilance",
    hint: "Baisses et anomalies qui méritent ton attention.",
    Icon: AlertCircle,
  },
];

// Reads the report's real numbers and asks Claude to interpret them. The
// figures come from the fact sheet built in insights.ts — the model comments,
// it never computes. A result stays in the panel until you insert it.
export default function InsightsPanel({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [html, setHtml] = useState<string | null>(null);
  const [heading, setHeading] = useState("Analyse");
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [inserted, setInserted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function run(intent: string, label: string, q?: string) {
    if (pending) return;
    setError(null);
    setHtml(null);
    setInserted(false);
    setHeading(label);
    startTransition(async () => {
      // A rejected async transition callback is rethrown during render and
      // escapes to the error boundary — the whole report page would be
      // replaced by a crash screen instead of this panel showing a message.
      try {
        const res = await askInsight(clientId, intent, q);
        if (res.ok) setHtml(res.html);
        else setError(res.error);
      } catch {
        setError("Analyse indisponible pour le moment — réessaie.");
      }
    });
  }

  function onAsk() {
    // The send button is disabled while pending; the Enter key was not, so a
    // held key fired one billed analysis per repeat.
    if (pending) return;
    const q = question.trim();
    if (q.length < 3) return;
    run("question", q.length > 60 ? `${q.slice(0, 57)}…` : q, q);
  }

  function onInsert() {
    if (pending || inserted || !html) return;
    startTransition(async () => {
      try {
        const res = await insertInsight(clientId, html, heading);
        if (res.ok) setInserted(true);
        else setError(res.error ?? "Insertion impossible.");
      } catch {
        setError("Insertion impossible pour le moment — réessaie.");
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-brand/30 bg-brand-soft px-3 py-2 text-sm font-medium text-brand transition-colors hover:bg-brand/15"
      >
        <Sparkles size={16} /> Analyse IA
      </button>

      {open && (
        <div className="no-print fixed inset-0 z-40 flex justify-end">
          <button
            aria-label="Fermer le panneau"
            onClick={() => setOpen(false)}
            className="flex-1 cursor-default bg-ink/20"
          />
          <aside className="flex h-full w-full max-w-[440px] flex-col border-l border-border bg-surface shadow-soft">
            <header className="flex items-center justify-between border-b border-border px-5 py-4">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
                <Sparkles size={16} className="text-brand" /> Analyse IA
              </p>
              <button
                onClick={() => setOpen(false)}
                className="grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-bg"
                aria-label="Fermer"
              >
                <X size={15} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {!html && !pending && !error && (
                <>
                  <p className="text-sm font-medium text-ink">
                    Quel angle d&apos;analyse veux-tu&nbsp;?
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    L&apos;analyse porte sur les chiffres réels de la période affichée. Les
                    valeurs sont calculées par l&apos;application, jamais par le modèle.
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {INTENTS.map(({ key, label, hint, Icon }) => (
                      <button
                        key={key}
                        onClick={() => run(key, label)}
                        className="rounded-card border border-border bg-white p-3 text-left transition-colors hover:border-brand/40 hover:bg-brand-soft/40"
                      >
                        <Icon size={16} className="text-brand" />
                        <span className="mt-2 block text-sm font-semibold text-ink">{label}</span>
                        <span className="mt-0.5 block text-[11px] leading-snug text-muted">
                          {hint}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {pending && (
                <p className="inline-flex items-center gap-2 text-sm text-ink-soft">
                  <Loader2 size={15} className="animate-spin text-brand" />
                  Lecture des chiffres et rédaction…
                </p>
              )}

              {error && !pending && (
                <div className="rounded-lg bg-negative-soft px-3 py-2.5 text-sm text-negative">
                  {error}
                  <button
                    onClick={() => setError(null)}
                    className="mt-2 block text-xs font-semibold underline"
                  >
                    Revenir aux angles d&apos;analyse
                  </button>
                </div>
              )}

              {html && !pending && (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {heading}
                  </p>
                  <div
                    className="prose-block mt-2 text-sm"
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      onClick={onInsert}
                      disabled={pending || inserted}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
                    >
                      {inserted ? <Check size={13} /> : <Plus size={13} />}
                      {inserted ? "Ajouté au rapport" : "Insérer dans le rapport"}
                    </button>
                    <button
                      onClick={() => {
                        setHtml(null);
                        setInserted(false);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-bg"
                    >
                      <RotateCcw size={13} /> Autre analyse
                    </button>
                  </div>
                  {inserted && (
                    <p className="mt-2 text-[11px] text-muted">
                      Le bloc est ajouté en bas du rapport — recharge la page pour le voir.
                    </p>
                  )}
                </>
              )}
            </div>

            <footer className="border-t border-border px-5 py-3">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onAsk();
                  }}
                  placeholder="Pose une question sur ces données…"
                  maxLength={500}
                  className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-brand/50"
                />
                <button
                  onClick={onAsk}
                  disabled={pending || question.trim().length < 3}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand text-white transition-colors hover:bg-brand-700 disabled:opacity-40"
                  aria-label="Envoyer la question"
                >
                  <ArrowUp size={16} />
                </button>
              </div>
            </footer>
          </aside>
        </div>
      )}
    </>
  );
}
