// French labels + tones for post/target statuses. One map, used everywhere,
// so a status never renders as its raw enum value.

export const POST_STATUS: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Brouillon", cls: "bg-bg text-muted" },
  PENDING_APPROVAL: { label: "En attente d'approbation", cls: "bg-[#fef3e2] text-[#b45309]" },
  SCHEDULED: { label: "Planifié", cls: "bg-brand-soft text-brand" },
  PUBLISHING: { label: "Publication…", cls: "bg-brand-soft text-brand" },
  PARTIAL: { label: "Partiellement publié", cls: "bg-[#fef3e2] text-[#b45309]" },
  PUBLISHED: { label: "Publié", cls: "bg-positive-soft text-positive" },
  FAILED: { label: "Échec", cls: "bg-negative-soft text-negative" },
  CANCELLED: { label: "Annulé", cls: "bg-bg text-muted" },
};

export const TARGET_STATUS: Record<string, { label: string; cls: string }> = {
  scheduled: { label: "En file", cls: "bg-brand-soft text-brand" },
  running: { label: "En cours…", cls: "bg-brand-soft text-brand" },
  published: { label: "Publié", cls: "bg-positive-soft text-positive" },
  failed: { label: "Échec", cls: "bg-negative-soft text-negative" },
  cancelled: { label: "Annulé", cls: "bg-bg text-muted" },
};

export const NETWORK_LABEL: Record<string, string> = {
  linkedin: "LinkedIn",
  meta_fb: "Facebook",
  meta_ig: "Instagram",
  x: "X",
  gmb: "Google Business",
};

export const NETWORK_COLOR: Record<string, string> = {
  linkedin: "#0A66C2",
  meta_fb: "#1877F2",
  meta_ig: "#E4405F",
  x: "#111111",
  gmb: "#4285F4",
};
