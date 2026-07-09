// Streaming skeleton while the report (and its live provider fetches) loads.
export default function ReportLoading() {
  return (
    <div className="mx-auto max-w-[1180px] animate-pulse px-6 py-6">
      <div className="h-24 rounded-card border border-border/60 bg-surface shadow-soft" />
      <div className="mt-4 grid grid-cols-12 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="col-span-12 h-32 rounded-card border border-border/60 bg-surface shadow-soft sm:col-span-6 xl:col-span-3"
          />
        ))}
        <div className="col-span-12 h-72 rounded-card border border-border/60 bg-surface shadow-soft xl:col-span-8" />
        <div className="col-span-12 h-72 rounded-card border border-border/60 bg-surface shadow-soft xl:col-span-4" />
      </div>
      <p className="mt-6 text-center text-xs text-muted">Chargement des données…</p>
    </div>
  );
}
