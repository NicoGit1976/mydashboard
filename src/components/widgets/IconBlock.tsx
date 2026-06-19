import { HelpCircle } from "lucide-react";
import { getIconByName } from "@/lib/icon-catalog";

function radiusFor(shape: string) {
  if (shape === "circle") return "9999px";
  if (shape === "rounded") return "18px";
  if (shape === "square") return "10px";
  return "0"; // none
}

// Customizable icon badge — placeable anywhere (e.g. beside KPI blocks).
export default function IconBlock({
  icon,
  shape = "circle",
  bg,
  border,
  iconColor,
}: {
  icon?: string;
  shape?: string;
  bg?: string;
  border?: string;
  iconColor?: string;
}) {
  const Icon = getIconByName(icon) ?? HelpCircle;
  const boxed = shape !== "none";

  return (
    <div className="flex h-full items-center justify-center rounded-card border border-border/60 bg-surface p-6 shadow-soft">
      <div
        className="grid h-20 w-20 place-items-center"
        style={{
          background: boxed ? bg || "#ececfe" : "transparent",
          border: boxed && border ? `2px solid ${border}` : undefined,
          borderRadius: radiusFor(shape),
        }}
      >
        <Icon size={40} color={iconColor || "#4f46e5"} />
      </div>
    </div>
  );
}
