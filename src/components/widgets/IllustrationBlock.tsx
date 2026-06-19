import { getIllustration } from "@/components/illustrations";

// Decorative vector block — renders the chosen illustration (free, recolorable).
export default function IllustrationBlock({
  illustration,
  color,
}: {
  illustration?: string;
  color?: string;
}) {
  const ill = getIllustration(illustration);
  const Svg = ill.Svg;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 rounded-card border border-border/60 bg-gradient-to-br from-brand-soft to-white p-6 text-center shadow-soft">
      <div className="w-full max-w-[240px]">
        <Svg color={color} />
      </div>
      <div>
        <p className="text-[13px] font-semibold text-ink">{ill.label}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Illustration vectorielle — choisis-en une autre via ⚙.
        </p>
      </div>
    </div>
  );
}
