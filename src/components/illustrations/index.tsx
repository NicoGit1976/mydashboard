import type { ComponentType, ReactNode } from "react";

// Self-authored, license-clean, recolorable flat illustrations. `color` tints
// the primary shapes; accents are fixed for contrast.
type IllProps = { color?: string; className?: string };

const BRAND = "#4f46e5";
const CY = "#06b6d4";
const AM = "#f59e0b";
const PK = "#ec4899";
const GR = "#10b981";
const SOFT = "#e6e8fb";

function Frame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 240 180" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <ellipse cx="120" cy="164" rx="92" ry="11" fill={SOFT} />
      {children}
    </svg>
  );
}

function Growth({ color = BRAND, className }: IllProps) {
  return (
    <Frame className={className}>
      <rect x="44" y="104" width="20" height="48" rx="5" fill={CY} />
      <rect x="76" y="84" width="20" height="68" rx="5" fill={color} />
      <rect x="108" y="64" width="20" height="88" rx="5" fill={color} />
      <rect x="140" y="44" width="20" height="108" rx="5" fill={AM} />
      <polyline points="54,96 86,76 118,58 150,38" stroke={GR} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="150" cy="38" r="5" fill={GR} />
      <circle cx="190" cy="56" r="6" fill={PK} />
    </Frame>
  );
}

function Analytics({ color = BRAND, className }: IllProps) {
  return (
    <Frame className={className}>
      <rect x="34" y="42" width="118" height="92" rx="12" fill="#fff" stroke={SOFT} strokeWidth="3" />
      <rect x="52" y="52" width="46" height="8" rx="4" fill={SOFT} />
      <rect x="50" y="98" width="14" height="22" rx="3" fill={CY} />
      <rect x="72" y="84" width="14" height="36" rx="3" fill={color} />
      <rect x="94" y="70" width="14" height="50" rx="3" fill={color} />
      <rect x="116" y="58" width="14" height="62" rx="3" fill={AM} />
      <circle cx="184" cy="88" r="28" fill="none" stroke={SOFT} strokeWidth="12" />
      <circle cx="184" cy="88" r="28" fill="none" stroke={color} strokeWidth="12" strokeDasharray="118 200" strokeLinecap="round" transform="rotate(-90 184 88)" />
    </Frame>
  );
}

function Audience({ color = BRAND, className }: IllProps) {
  return (
    <Frame className={className}>
      <circle cx="72" cy="74" r="17" fill={CY} />
      <path d="M46 150 a26 26 0 0 1 52 0 z" fill={CY} />
      <circle cx="168" cy="74" r="17" fill={AM} />
      <path d="M142 150 a26 26 0 0 1 52 0 z" fill={AM} />
      <circle cx="120" cy="58" r="23" fill={color} />
      <path d="M85 150 a35 35 0 0 1 70 0 z" fill={color} />
    </Frame>
  );
}

function Social({ color = BRAND, className }: IllProps) {
  return (
    <Frame className={className}>
      <path d="M40 48 h94 a14 14 0 0 1 14 14 v36 a14 14 0 0 1 -14 14 h-52 l-24 20 v-20 h-18 a14 14 0 0 1 -14 -14 v-36 a14 14 0 0 1 14 -14 z" fill={color} />
      <circle cx="62" cy="80" r="5" fill="#fff" />
      <circle cx="86" cy="80" r="5" fill="#fff" />
      <circle cx="110" cy="80" r="5" fill="#fff" />
      <path d="M178 60 a16 16 0 0 1 28 10 c0 19 -28 36 -28 36 s-28 -17 -28 -36 a16 16 0 0 1 28 -10 z" fill={PK} />
    </Frame>
  );
}

function Target({ color = BRAND, className }: IllProps) {
  return (
    <Frame className={className}>
      <circle cx="106" cy="92" r="54" fill="none" stroke={SOFT} strokeWidth="10" />
      <circle cx="106" cy="92" r="34" fill="none" stroke={color} strokeWidth="10" />
      <circle cx="106" cy="92" r="13" fill={AM} />
      <line x1="106" y1="92" x2="190" y2="38" stroke={GR} strokeWidth="4" strokeLinecap="round" />
      <path d="M188 32 l16 -6 -4 14 z" fill={CY} />
    </Frame>
  );
}

function Megaphone({ color = BRAND, className }: IllProps) {
  return (
    <Frame className={className}>
      <path d="M52 80 l86 -36 v96 l-86 -36 z" fill={color} />
      <rect x="38" y="72" width="16" height="40" rx="4" fill={CY} />
      <path d="M138 60 v76 l18 7 v-90 z" fill={AM} />
      <path d="M170 72 q16 22 0 44" stroke={PK} strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M186 60 q26 34 0 68" stroke={PK} strokeWidth="4" fill="none" strokeLinecap="round" />
    </Frame>
  );
}

function Rocket({ color = BRAND, className }: IllProps) {
  return (
    <Frame className={className}>
      <path d="M120 26 c22 16 30 46 30 72 h-60 c0 -26 8 -56 30 -72 z" fill={color} />
      <circle cx="120" cy="72" r="12" fill="#fff" />
      <circle cx="120" cy="72" r="6" fill={CY} />
      <path d="M90 100 l-22 18 24 -2 z" fill={AM} />
      <path d="M150 100 l22 18 -24 -2 z" fill={AM} />
      <path d="M108 112 h24 l-6 28 -12 0 z" fill={PK} />
      <circle cx="60" cy="48" r="4" fill={AM} />
      <circle cx="184" cy="62" r="3" fill={CY} />
    </Frame>
  );
}

function Trophy({ color = BRAND, className }: IllProps) {
  return (
    <Frame className={className}>
      <path d="M84 42 h72 v24 a36 36 0 0 1 -72 0 z" fill={color} />
      <path d="M84 48 h-18 a16 16 0 0 0 16 22 z" fill={AM} />
      <path d="M156 48 h18 a16 16 0 0 1 -16 22 z" fill={AM} />
      <rect x="112" y="100" width="16" height="22" fill={color} />
      <rect x="90" y="122" width="60" height="14" rx="4" fill={CY} />
      <path d="M120 50 l4 9 10 1 -7 7 2 10 -9 -5 -9 5 2 -10 -7 -7 10 -1 z" fill="#fff" />
      <circle cx="62" cy="40" r="3" fill={PK} />
      <circle cx="180" cy="44" r="3" fill={GR} />
    </Frame>
  );
}

export type Illustration = { key: string; label: string; Svg: ComponentType<IllProps> };

export const ILLUSTRATIONS: Illustration[] = [
  { key: "growth", label: "Croissance", Svg: Growth },
  { key: "analytics", label: "Analytics", Svg: Analytics },
  { key: "audience", label: "Audience", Svg: Audience },
  { key: "social", label: "Réseaux sociaux", Svg: Social },
  { key: "target", label: "Objectif", Svg: Target },
  { key: "megaphone", label: "Campagne", Svg: Megaphone },
  { key: "rocket", label: "Lancement", Svg: Rocket },
  { key: "trophy", label: "Réussite", Svg: Trophy },
];

export function getIllustration(key?: string): Illustration {
  return ILLUSTRATIONS.find((i) => i.key === key) ?? ILLUSTRATIONS[0];
}
