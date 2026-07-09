import type { Widget } from "@prisma/client";
import WidgetCard from "@/components/report/WidgetCard";
import KpiCard from "@/components/widgets/KpiCard";
import LineChartCard from "@/components/widgets/LineChartCard";
import DonutChartCard from "@/components/widgets/DonutChartCard";
import BarChartCard from "@/components/widgets/BarChartCard";
import TableCard from "@/components/widgets/TableCard";
import ContentBlock from "@/components/widgets/ContentBlock";
import IllustrationBlock from "@/components/widgets/IllustrationBlock";
import IconBlock from "@/components/widgets/IconBlock";
import type { ReportData } from "@/lib/report-data";
import type { SourceKey } from "@/lib/sources";
import { fmtCompact } from "@/lib/format";
import { sanitizeReportHtml } from "@/lib/sanitize";

// Maps a stored Widget (type + config) to the right widget component, reading
// values from the per-client data bundle (live where connected, mock otherwise).
export default function WidgetRenderer({
  widget,
  data,
}: {
  widget: Widget;
  data: ReportData;
}) {
  const cfg = (widget.config ?? {}) as Record<string, string>;
  const source = (widget.sourceKey ?? undefined) as SourceKey | undefined;
  const subtitle = cfg.subtitle;

  switch (widget.type) {
    case "kpi": {
      const m = data.kpis[cfg.metric] ?? data.kpis.sessions;
      // "démo" pill only once at least one source is live — so an all-mock
      // report (nothing connected yet) isn't plastered with badges.
      const demo = data.liveSources.length > 0 && !data.liveMetrics.includes(cfg.metric);
      return (
        <KpiCard
          label={m.label}
          value={m.value}
          delta={m.delta}
          source={m.source}
          spark={m.spark}
          format={m.format}
          invert={m.invert}
          demo={demo}
        />
      );
    }
    case "line": {
      const d = data.datasets.traffic;
      return (
        <WidgetCard title={widget.title ?? "Trafic web"} subtitle={subtitle} source={source}>
          <LineChartCard labels={d.labels} sessions={d.sessions} users={d.users} />
        </WidgetCard>
      );
    }
    case "donut": {
      // Center value = real total of the rendered data (live or mock), so it
      // can never drift from the chart it sits in.
      const total = data.datasets.channels.reduce((s, c) => s + c.value, 0);
      return (
        <WidgetCard title={widget.title ?? "Canaux"} subtitle={subtitle} source={source}>
          <DonutChartCard
            data={data.datasets.channels}
            centerValue={fmtCompact(total)}
            centerLabel={cfg.centerLabel || "sessions"}
          />
        </WidgetCard>
      );
    }
    case "bar":
      return (
        <WidgetCard title={widget.title ?? "Engagement par réseau"} subtitle={subtitle} source={source}>
          <BarChartCard data={data.datasets.networks} />
        </WidgetCard>
      );
    case "table":
      return (
        <WidgetCard title={widget.title ?? "Pages les plus vues"} subtitle={subtitle} source={source}>
          <TableCard rows={data.datasets.topPages} />
        </WidgetCard>
      );
    case "content":
      // Sanitize at render too (defense-in-depth): protects rows written before
      // write-sanitization existed, and the public /share surface.
      return (
        <WidgetCard title={widget.title ?? "Bloc de contenu"} subtitle={subtitle} source={source}>
          <ContentBlock html={sanitizeReportHtml(cfg.html ?? "")} />
        </WidgetCard>
      );
    case "ai":
      return (
        <WidgetCard title={widget.title ?? "Résumé IA"} subtitle={subtitle}>
          {cfg.html ? (
            <div className="prose-block" dangerouslySetInnerHTML={{ __html: sanitizeReportHtml(cfg.html) }} />
          ) : (
            <p className="text-sm text-muted">
              Choisis un ton et clique « Générer le résumé » dans ⚙ pour produire la synthèse.
            </p>
          )}
        </WidgetCard>
      );
    case "icon":
      return (
        <IconBlock
          icon={cfg.icon}
          shape={cfg.shape}
          bg={cfg.bg}
          border={cfg.border}
          iconColor={cfg.iconColor}
        />
      );
    case "illustration":
      return <IllustrationBlock illustration={cfg.illustration} color={cfg.color} />;
    default:
      return null;
  }
}
