// Guard for the report-template engine. Run with `npm run check`.
import {
  REPORT_TEMPLATES,
  buildTemplateLayout,
  suggestTemplate,
  widgetIsFillable,
} from "../src/lib/report-templates";
import { WIDGET_BLUEPRINTS, WIDGET_PALETTE, DEFAULT_REPORT_LAYOUT } from "../src/lib/metrics-catalog";

let failures = 0;
function check(name: string, cond: boolean, extra = "") {
  if (cond) console.log(`  ok   ${name}`);
  else {
    failures++;
    console.log(`  FAIL ${name} ${extra}`);
  }
}

const metricOf = (w: { type: string; config: Record<string, unknown> }) =>
  w.type === "kpi" ? String(w.config.metric) : "";
const datasetOf = (w: { type: string; config: Record<string, unknown> }) =>
  String(w.config.dataset ?? "");

console.log("\n1. Every key a template or the fallback references must exist");
{
  // This is the class of bug that was live: DEFAULT_REPORT_LAYOUT named
  // "kpi:bounce_rate", which had no blueprint — creating the first report for
  // any new client threw on `bp.type`.
  for (const key of DEFAULT_REPORT_LAYOUT)
    check(`fallback key "${key}" exists`, Boolean(WIDGET_BLUEPRINTS[key]));
  for (const t of REPORT_TEMPLATES)
    for (const s of t.sections)
      for (const key of s.widgets)
        check(`${t.key} → "${key}" exists`, Boolean(WIDGET_BLUEPRINTS[key]));
  for (const b of WIDGET_PALETTE)
    check(`palette key "${b.key}" exists`, Boolean(WIDGET_BLUEPRINTS[b.key]));
}

console.log("\n2. No widget is laid down that the client's sources cannot fill");
{
  const cases: { providers: string[]; banned: string[]; expected: string[] }[] = [
    { providers: ["gsc"], banned: ["sessions", "visitors", "pageviews", "bounce_rate"], expected: ["gsc_clicks"] },
    { providers: ["matomo"], banned: ["gsc_clicks", "gsc_position", "fb_reach", "li_follow"], expected: ["sessions"] },
    { providers: ["meta"], banned: ["sessions", "gsc_clicks", "li_follow"], expected: ["fb_reach"] },
    { providers: ["linkedin"], banned: ["fb_reach", "ig_follow", "sessions"], expected: ["li_follow"] },
  ];
  for (const c of cases) {
    for (const t of REPORT_TEMPLATES) {
      const laid = buildTemplateLayout(t, c.providers);
      const metrics = laid.map(metricOf).filter(Boolean);
      const bad = metrics.filter((m) => c.banned.includes(m));
      check(
        `[${c.providers}] ${t.key}: no unfillable KPI`,
        bad.length === 0,
        `got ${bad.join(", ")}`,
      );
    }
    // The template built for this provider must still produce its own metrics.
    const best = REPORT_TEMPLATES.find((t) => t.key === suggestTemplate(c.providers))!;
    const metrics = buildTemplateLayout(best, c.providers).map(metricOf);
    check(
      `[${c.providers}] suggested template "${best.key}" carries ${c.expected[0]}`,
      c.expected.every((m) => metrics.includes(m)),
      `got ${metrics.join(", ")}`,
    );
  }
}

console.log("\n3. Datasets with no fetcher are never seeded");
{
  const all = ["matomo", "ga4", "gsc", "meta", "linkedin"];
  for (const t of REPORT_TEMPLATES) {
    const laid = buildTemplateLayout(t, all);
    check(
      `${t.key}: no "networks" chart (no provider fills it)`,
      !laid.some((w) => datasetOf(w) === "networks"),
    );
  }
  check("bar:networks is unfillable even with every provider", !widgetIsFillable("bar:networks", new Set(all)));
  check("kpi:gmb is unfillable (no GBP connector yet)", !widgetIsFillable("kpi:gmb", new Set(all)));
  check("kpi:social is unfillable (no provider emits it)", !widgetIsFillable("kpi:social", new Set(all)));
}

console.log("\n4. Sections and headings stay coherent");
{
  for (const t of REPORT_TEMPLATES) {
    for (const providers of [[], ["gsc"], ["matomo"], ["meta"], ["matomo", "gsc", "meta", "linkedin"]]) {
      const laid = buildTemplateLayout(t, providers);
      // No heading may be the last block, and no two headings may be adjacent:
      // either means a chapter title introducing nothing.
      let orphan = false;
      laid.forEach((w, i) => {
        if (w.type !== "section") return;
        const next = laid[i + 1];
        if (!next || next.type === "section") orphan = true;
      });
      check(`${t.key} [${providers}]: no empty chapter title`, !orphan);
      if (t.key !== "blank" && laid.length > 0) {
        const dataBlocks = laid.filter(
          (w) => !["section", "content", "illustration", "icon", "ai"].includes(w.type),
        );
        check(`${t.key} [${providers}]: has at least one data block`, dataBlocks.length > 0);
      }
    }
  }
}

console.log("\n5. A client with nothing connected gets nothing fabricated");
{
  for (const t of REPORT_TEMPLATES) {
    const laid = buildTemplateLayout(t, []);
    // Short links are first-party and always available, so the social template
    // legitimately keeps its short-link counters. Everything else must drop.
    const metrics = laid.map(metricOf).filter(Boolean);
    const external = metrics.filter((m) => !m.startsWith("sl_"));
    check(`${t.key}: no external KPI without any source`, external.length === 0, `got ${external.join(", ")}`);
  }
}

console.log("\n6. suggestTemplate picks the subject the client has data for");
{
  check("nothing → blank", suggestTemplate([]) === "blank");
  check("matomo → web", suggestTemplate(["matomo"]) === "web");
  check("ga4 → web", suggestTemplate(["ga4"]) === "web");
  check("gsc only → seo", suggestTemplate(["gsc"]) === "seo");
  check("meta only → social", suggestTemplate(["meta"]) === "social");
  check("matomo+gsc → full", suggestTemplate(["matomo", "gsc"]) === "full");
  check("ga4+meta → full", suggestTemplate(["ga4", "meta"]) === "full");
}

console.log(failures === 0 ? "\nALL CHECKS PASSED\n" : `\n${failures} CHECK(S) FAILED\n`);
process.exit(failures === 0 ? 0 : 1);
