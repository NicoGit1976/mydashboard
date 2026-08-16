"use client";

import { useState, useTransition } from "react";
import { KeyRound, Loader2, Trash2 } from "lucide-react";
import { saveProviderApp, deleteProviderApp } from "@/lib/provider-app-actions";

// "Bring your own app": the user registers the OAuth application THEY created
// at the provider, so the authorisation screen carries their own identity and
// their usage sits under their own developer terms and rate limits.
//
// The secret is write-only by design — once saved it is never sent back to the
// browser, so this form shows the client id and an empty secret field, and
// leaving that field alone keeps the stored one.
export default function ProviderAppForm({
  provider,
  providerLabel,
  redirectUri,
  app,
}: {
  provider: string;
  providerLabel: string;
  redirectUri: string;
  app: { clientId: string; label: string | null } | null;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    if (pending) return;
    setError("");
    setSaved(false);
    formData.set("provider", provider);
    startTransition(async () => {
      try {
        const res = await saveProviderApp(formData);
        if (res.ok) {
          setSaved(true);
          setOpen(false);
        } else setError(res.error ?? "Enregistrement impossible.");
      } catch {
        setError("Enregistrement impossible pour le moment — réessaie.");
      }
    });
  }

  function onDelete() {
    if (pending) return;
    startTransition(async () => {
      try {
        const res = await deleteProviderApp(provider);
        if (!res.ok) setError(res.error ?? "Suppression impossible.");
      } catch {
        setError("Suppression impossible pour le moment — réessaie.");
      }
    });
  }

  const inputCls =
    "w-full rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs text-ink outline-none focus:border-brand/50";

  return (
    <div className="mt-3 border-t border-border pt-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink-soft transition-colors hover:text-brand"
      >
        <KeyRound size={12} className="text-brand" />
        {app ? "Mon application OAuth ✓" : "Utiliser ma propre application OAuth"}
      </button>

      {app && !open && (
        <p className="mt-1 text-[11px] text-muted">
          {app.label ? `${app.label} · ` : ""}
          <span className="font-mono">{app.clientId}</span>
        </p>
      )}
      {saved && !open && (
        <p className="mt-1 text-[11px] font-medium text-positive">Application enregistrée.</p>
      )}
      {error && (
        <p className="mt-1 text-[11px] font-medium text-negative">{error}</p>
      )}

      {open && (
        <form action={onSubmit} className="mt-2 space-y-2">
          <p className="text-[11px] leading-relaxed text-muted">
            Enregistre l&apos;application {providerLabel} que <strong>tu</strong> as créée.
            L&apos;écran d&apos;autorisation portera alors ton identité, et ton usage
            comptera sur tes propres quotas — pas sur ceux de l&apos;instance.
          </p>
          <div>
            <label className="block text-[11px] font-medium text-ink-soft">
              URL de redirection à déclarer chez {providerLabel}
            </label>
            <input readOnly value={redirectUri} onFocus={(e) => e.target.select()} className={`mt-1 ${inputCls} font-mono text-[10px] text-muted`} />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-ink-soft">Identifiant client</label>
            <input name="clientId" defaultValue={app?.clientId ?? ""} required className={`mt-1 ${inputCls}`} />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-ink-soft">
              Secret client{app ? " (laisser vide pour conserver l'actuel)" : ""}
            </label>
            <input
              name="clientSecret"
              type="password"
              autoComplete="off"
              required={!app}
              placeholder={app ? "••••••••" : ""}
              className={`mt-1 ${inputCls}`}
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-ink-soft">
              Repère (facultatif)
            </label>
            <input
              name="label"
              defaultValue={app?.label ?? ""}
              placeholder="Page NSG Consulting"
              className={`mt-1 ${inputCls}`}
            />
          </div>
          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
            >
              {pending && <Loader2 size={12} className="animate-spin" />}
              Enregistrer
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-muted hover:text-ink"
            >
              Annuler
            </button>
            {app && (
              <button
                type="button"
                onClick={onDelete}
                disabled={pending}
                className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-negative hover:underline disabled:opacity-60"
              >
                <Trash2 size={11} /> Oublier
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
