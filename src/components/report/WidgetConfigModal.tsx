"use client";

import { useState, useTransition } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import { updateWidget } from "@/lib/widget-actions";
import { generateSummary } from "@/lib/ai-actions";
import { KPI_METRIC_OPTIONS, TONE_OPTIONS } from "@/lib/metrics-catalog";
import { ILLUSTRATIONS } from "@/components/illustrations";
import { getIconByName, searchIcons } from "@/lib/icon-catalog";

const SHAPES: [string, string][] = [
  ["circle", "Rond"],
  ["rounded", "Arrondi"],
  ["square", "Carré"],
  ["none", "Sans"],
];

const inputCls =
  "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-brand";

const HAS_TITLE = ["line", "donut", "bar", "table", "content"];

export type WidgetData = {
  id: string;
  type: string;
  title: string | null;
  config: unknown;
  span: number;
};

export default function WidgetConfigModal({
  widget,
  clientId,
  onClose,
}: {
  widget: WidgetData;
  clientId: string;
  onClose: () => void;
}) {
  const cfg = (widget.config ?? {}) as Record<string, string>;
  const isAi = widget.type === "ai";

  const [title, setTitle] = useState(widget.title ?? "");
  const [subtitle, setSubtitle] = useState(cfg.subtitle ?? "");
  const [metric, setMetric] = useState(cfg.metric ?? "sessions");
  const [html, setHtml] = useState(cfg.html ?? "");
  const [pending, startTransition] = useTransition();

  // AI summary state
  const [tone, setTone] = useState(cfg.tone ?? "neutral");
  const [generated, setGenerated] = useState(cfg.html ?? "");
  const [aiError, setAiError] = useState("");
  const [genPending, setGenPending] = useState(false);

  // Illustration picker state
  const [illustration, setIllustration] = useState(cfg.illustration ?? "growth");

  // Icon widget state
  const [iconName, setIconName] = useState(cfg.icon || "Star");
  const [iconQuery, setIconQuery] = useState("");
  const [shape, setShape] = useState(cfg.shape || "circle");
  const [bg, setBg] = useState(cfg.bg || "#ececfe");
  const [border, setBorder] = useState(cfg.border || "#e9ebf3");
  const [iconColor, setIconColor] = useState(cfg.iconColor || "#4f46e5");
  const PreviewIcon = getIconByName(iconName);
  const previewRadius =
    shape === "circle" ? "9999px" : shape === "rounded" ? "14px" : shape === "square" ? "8px" : "0";

  const save = () => {
    const newConfig: Record<string, unknown> = { ...cfg };
    if (widget.type === "kpi") newConfig.metric = metric;
    if (widget.type === "content") newConfig.html = html;
    if (widget.type === "illustration") newConfig.illustration = illustration;
    if (widget.type === "icon") {
      newConfig.icon = iconName;
      newConfig.shape = shape;
      newConfig.bg = bg;
      newConfig.border = border;
      newConfig.iconColor = iconColor;
    }
    if (HAS_TITLE.includes(widget.type)) newConfig.subtitle = subtitle;
    const newTitle = HAS_TITLE.includes(widget.type) ? title || null : widget.title;
    startTransition(async () => {
      await updateWidget(widget.id, clientId, { title: newTitle, config: newConfig });
      onClose();
    });
  };

  const generate = async () => {
    setGenPending(true);
    setAiError("");
    const res = await generateSummary(widget.id, clientId, tone);
    setGenPending(false);
    if (res?.ok) setGenerated(res.html ?? "");
    else setAiError(res?.error ?? "Erreur lors de la génération.");
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-card border border-border bg-surface p-5 shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
            {isAi && <Sparkles size={15} className="text-brand" />}
            {isAi ? "Résumé IA" : "Configurer le widget"}
          </h3>
          <button onClick={onClose} className="text-muted transition-colors hover:text-ink">
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {isAi ? (
            <>
              <div>
                <label className="block text-xs font-medium text-ink-soft">
                  Ton de la synthèse
                </label>
                <div className="mt-2 flex flex-col gap-1.5">
                  {TONE_OPTIONS.map((o) => (
                    <label
                      key={o.value}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
                        tone === o.value
                          ? "border-brand bg-brand-soft text-ink"
                          : "border-border text-ink-soft hover:bg-bg"
                      }`}
                    >
                      <input
                        type="radio"
                        name="tone"
                        value={o.value}
                        checked={tone === o.value}
                        onChange={() => setTone(o.value)}
                        className="accent-[var(--color-brand)]"
                      />
                      {o.label}
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={generate}
                disabled={genPending}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
              >
                {genPending ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {genPending ? "Génération…" : "Générer le résumé"}
              </button>

              {aiError && (
                <p className="rounded-lg bg-negative-soft px-3 py-2 text-xs font-medium text-negative">
                  {aiError}
                </p>
              )}

              {generated && (
                <div className="rounded-lg border border-border bg-bg p-3">
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted">
                    Aperçu
                  </p>
                  <div className="prose-block" dangerouslySetInnerHTML={{ __html: generated }} />
                </div>
              )}
            </>
          ) : (
            <>
              {HAS_TITLE.includes(widget.type) && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-ink-soft">Titre</label>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} className={`mt-1 ${inputCls}`} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-soft">Sous-titre</label>
                    <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className={`mt-1 ${inputCls}`} />
                  </div>
                </>
              )}

              {widget.type === "kpi" && (
                <div>
                  <label className="block text-xs font-medium text-ink-soft">Métrique</label>
                  <select value={metric} onChange={(e) => setMetric(e.target.value)} className={`mt-1 ${inputCls}`}>
                    {KPI_METRIC_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {widget.type === "content" && (
                <div>
                  <label className="block text-xs font-medium text-ink-soft">Contenu (HTML)</label>
                  <textarea
                    value={html}
                    onChange={(e) => setHtml(e.target.value)}
                    rows={7}
                    className={`mt-1 ${inputCls} font-mono text-xs leading-relaxed`}
                  />
                  <div className="mt-2 rounded-lg border border-border bg-bg p-3">
                    <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted">
                      Aperçu
                    </p>
                    <div className="prose-block" dangerouslySetInnerHTML={{ __html: html }} />
                  </div>
                </div>
              )}

              {widget.type === "illustration" && (
                <div>
                  <label className="block text-xs font-medium text-ink-soft">Illustration</label>
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    {ILLUSTRATIONS.map((ill) => {
                      const Svg = ill.Svg;
                      return (
                        <button
                          key={ill.key}
                          type="button"
                          title={ill.label}
                          onClick={() => setIllustration(ill.key)}
                          className={`grid place-items-center rounded-lg border p-1.5 transition-colors ${
                            illustration === ill.key
                              ? "border-brand bg-brand-soft"
                              : "border-border hover:bg-bg"
                          }`}
                        >
                          <Svg />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {widget.type === "icon" && (
                <>
                  <div className="flex items-center gap-3">
                    <div
                      className="grid h-14 w-14 place-items-center"
                      style={{
                        background: shape !== "none" ? bg : "transparent",
                        border: shape !== "none" && border ? `2px solid ${border}` : undefined,
                        borderRadius: previewRadius,
                      }}
                    >
                      {PreviewIcon && <PreviewIcon size={28} color={iconColor} />}
                    </div>
                    <p className="text-xs text-muted">
                      Aperçu · <span className="font-medium text-ink-soft">{iconName}</span>
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink-soft">Forme</label>
                    <div className="mt-1 flex gap-2">
                      {SHAPES.map(([v, l]) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setShape(v)}
                          className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                            shape === v
                              ? "border-brand bg-brand-soft text-brand"
                              : "border-border text-ink-soft hover:bg-bg"
                          }`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-ink-soft">Icône</label>
                      <input type="color" value={iconColor} onChange={(e) => setIconColor(e.target.value)} className="mt-1 h-9 w-full cursor-pointer rounded-lg border border-border bg-white p-1" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-ink-soft">Fond</label>
                      <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} className="mt-1 h-9 w-full cursor-pointer rounded-lg border border-border bg-white p-1" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-ink-soft">Contour</label>
                      <input type="color" value={border} onChange={(e) => setBorder(e.target.value)} className="mt-1 h-9 w-full cursor-pointer rounded-lg border border-border bg-white p-1" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink-soft">Icône (recherche)</label>
                    <input
                      value={iconQuery}
                      onChange={(e) => setIconQuery(e.target.value)}
                      placeholder="heart, chart, user, mail…"
                      className={`mt-1 ${inputCls}`}
                    />
                    <div className="mt-2 grid max-h-44 grid-cols-8 gap-1.5 overflow-y-auto rounded-lg border border-border p-2">
                      {searchIcons(iconQuery, 64).map(({ name, Icon }) => (
                        <button
                          key={name}
                          type="button"
                          title={name}
                          onClick={() => setIconName(name)}
                          className={`grid h-8 w-8 place-items-center rounded transition-colors ${
                            iconName === name ? "bg-brand-soft text-brand" : "text-ink-soft hover:bg-bg"
                          }`}
                        >
                          <Icon size={16} />
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          {isAi ? (
            <button
              onClick={onClose}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              Fermer
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-bg"
              >
                Annuler
              </button>
              <button
                onClick={save}
                disabled={pending}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
              >
                Enregistrer
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
