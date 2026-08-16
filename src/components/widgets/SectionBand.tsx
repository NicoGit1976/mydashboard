// Chapter divider inside a report. Without these a long report is one
// undifferentiated wall of cards; with them the client can see at a glance
// that they're reading about traffic, then about Google, then about social.
export default function SectionBand({
  heading,
  color,
}: {
  heading?: string;
  color?: string;
}) {
  return (
    <div
      className="break-inside-avoid rounded-card px-5 py-3.5"
      style={{ background: color || "#2c3550" }}
    >
      <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-white">
        {heading?.trim() || "Titre de section"}
      </h2>
    </div>
  );
}
