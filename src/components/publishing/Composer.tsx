"use client";

import { useActionState, useMemo, useState } from "react";
import { Send } from "lucide-react";
import { createPost, updatePost, type PublishState } from "@/lib/publishing-actions";
import { NETWORK_LIMITS, effectiveLength } from "@/lib/publish-targets";
import { NETWORK_COLOR, NETWORK_LABEL } from "@/lib/post-status";

export type Candidate = {
  key: string;
  provider: string;
  externalId: string;
  label: string;
  connectionStatus: string;
};

const inputCls =
  "mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-brand";

// Compose once → publish to several networks. Character counters are per
// SELECTED network (X counts every URL as 23 chars); the server re-validates
// everything, so these are guidance, not the gate.
export default function Composer({
  clientId,
  postId,
  candidates,
  initial,
}: {
  clientId: string;
  postId?: string;
  candidates: Candidate[];
  initial?: { body: string; scheduledAt: string | null; targetKeys: string[]; media: string[] };
}) {
  const action = postId
    ? updatePost.bind(null, postId)
    : createPost.bind(null, clientId);
  const [state, formAction, pending] = useActionState<PublishState, FormData>(action, null);

  const [body, setBody] = useState(initial?.body ?? "");
  const [selected, setSelected] = useState<string[]>(initial?.targetKeys ?? []);
  const [hasImage, setHasImage] = useState((initial?.media?.length ?? 0) > 0);

  const chosenProviders = useMemo(
    () => [...new Set(candidates.filter((c) => selected.includes(c.key)).map((c) => c.provider))],
    [candidates, selected],
  );

  function toggle(key: string) {
    setSelected((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="rounded-card border border-border/60 bg-surface p-5 shadow-soft">
        <label className="block text-xs font-medium text-ink-soft">Texte du post</label>
        <textarea
          name="body"
          rows={6}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Ce que tu veux publier…"
          className={inputCls}
        />

        {chosenProviders.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {chosenProviders.map((p) => {
              const lim = NETWORK_LIMITS[p];
              const len = effectiveLength(body, p);
              const over = lim && len > lim.maxChars;
              return (
                <span
                  key={p}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${over ? "bg-negative-soft text-negative" : "bg-bg text-muted"}`}
                >
                  {NETWORK_LABEL[p] ?? p} {len}/{lim?.maxChars ?? "?"}
                </span>
              );
            })}
          </div>
        )}

        <label className="mt-4 block text-xs font-medium text-ink-soft">
          Image <span className="text-muted">(optionnelle — 1 max, 2 Mo)</span>
        </label>
        <input
          name="image"
          type="file"
          accept="image/*"
          onChange={(e) => setHasImage((e.target.files?.length ?? 0) > 0)}
          className="mt-1 text-sm text-ink-soft file:mr-3 file:rounded-md file:border-0 file:bg-brand-soft file:px-2 file:py-1 file:text-xs file:font-medium file:text-brand"
        />
        {chosenProviders.includes("meta_ig") && !hasImage && (
          <p className="mt-1 text-[11px] font-medium text-negative">
            Instagram exige une image (JPEG).
          </p>
        )}

        <label className="mt-4 block text-xs font-medium text-ink-soft">
          Publier le <span className="text-muted">(vide = dès approbation · heure UTC)</span>
        </label>
        <input
          name="scheduledAt"
          type="datetime-local"
          defaultValue={initial?.scheduledAt ?? ""}
          className={inputCls}
        />
      </div>

      <div className="rounded-card border border-border/60 bg-surface p-5 shadow-soft">
        <p className="text-sm font-semibold text-ink">Destinations</p>
        <p className="mb-3 mt-0.5 text-xs text-muted">
          Les comptes personnels publieront <strong className="font-medium text-ink-soft">au nom
          de leur propriétaire</strong>.
        </p>
        {candidates.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-bg px-3 py-3 text-xs text-muted">
            Aucune destination. Connecte un compte dans{" "}
            <span className="font-medium text-ink-soft">Sources de données</span>, puis attribue
            une page à ce client dans ses réglages.
          </p>
        ) : (
          <div className="space-y-1.5">
            {candidates.map((c) => (
              <label
                key={c.key}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-white px-3 py-2 text-xs transition-colors hover:border-brand/40"
              >
                <input
                  type="checkbox"
                  name="targetKeys"
                  value={c.key}
                  checked={selected.includes(c.key)}
                  onChange={() => toggle(c.key)}
                  className="h-4 w-4"
                />
                <span
                  className="inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-white"
                  style={{ background: NETWORK_COLOR[c.provider] ?? "#6b7280" }}
                >
                  {NETWORK_LABEL[c.provider] ?? c.provider}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium text-ink">
                  {c.label}
                  {/* The raw id, so a label can never disguise which account
                      is about to be posted to. */}
                  <span className="ml-1.5 font-mono text-[10px] font-normal text-muted">
                    {c.externalId.replace("urn:li:person:", "")}
                  </span>
                </span>
                {c.connectionStatus === "error" && (
                  <span className="rounded-full bg-negative-soft px-1.5 py-0.5 text-[10px] font-medium text-negative">
                    à reconnecter
                  </span>
                )}
              </label>
            ))}
          </div>
        )}
      </div>

      {state && (
        <p className={`text-xs font-medium ${state.ok ? "text-positive" : "text-negative"}`}>
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
      >
        <Send size={15} />
        {pending ? "Enregistrement…" : "Enregistrer le brouillon"}
      </button>
    </form>
  );
}
