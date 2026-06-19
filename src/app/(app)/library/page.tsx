import {
  AtSign,
  Award,
  BarChart3,
  Calendar,
  Camera,
  Eye,
  Globe,
  Hash,
  Heart,
  MapPin,
  Megaphone,
  MessageCircle,
  MousePointerClick,
  Share2,
  Star,
  Target,
  ThumbsUp,
  TrendingUp,
  Users,
} from "lucide-react";
import { ILLUSTRATIONS } from "@/components/illustrations";

const ICONS = [
  { Icon: TrendingUp, name: "Tendance" },
  { Icon: BarChart3, name: "Barres" },
  { Icon: Users, name: "Audience" },
  { Icon: Globe, name: "Web" },
  { Icon: Eye, name: "Vues" },
  { Icon: MousePointerClick, name: "Clics" },
  { Icon: Heart, name: "J'aime" },
  { Icon: MessageCircle, name: "Messages" },
  { Icon: Share2, name: "Partages" },
  { Icon: ThumbsUp, name: "Pouce" },
  { Icon: Target, name: "Objectif" },
  { Icon: Megaphone, name: "Campagne" },
  { Icon: Award, name: "Récompense" },
  { Icon: Star, name: "Étoile" },
  { Icon: Calendar, name: "Période" },
  { Icon: MapPin, name: "Lieu" },
  { Icon: Camera, name: "Photo" },
  { Icon: AtSign, name: "Mention" },
  { Icon: Hash, name: "Hashtag" },
];

export default function LibraryPage() {
  return (
    <div className="mx-auto max-w-[1180px] px-6 py-6">
      <h1 className="text-xl font-semibold tracking-tight text-ink">Bibliothèque</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Illustrations et icônes gratuites, à insérer dans tes rapports via le bloc « Illustration ».
      </p>

      <h2 className="mt-6 text-sm font-semibold text-ink">Illustrations vectorielles</h2>
      <p className="mt-0.5 text-xs text-muted">Recolorables à la couleur de ta charte.</p>
      <div className="mt-3 grid grid-cols-12 gap-4">
        {ILLUSTRATIONS.map((ill) => {
          const Svg = ill.Svg;
          return (
            <div
              key={ill.key}
              className="col-span-6 rounded-card border border-border/60 bg-surface p-3 shadow-soft sm:col-span-4 lg:col-span-3"
            >
              <div className="rounded-lg bg-gradient-to-br from-brand-soft to-white p-2">
                <Svg />
              </div>
              <p className="mt-2 text-center text-xs font-medium text-ink">{ill.label}</p>
            </div>
          );
        })}
      </div>

      <h2 className="mt-8 text-sm font-semibold text-ink">Icônes</h2>
      <p className="mt-0.5 text-xs text-muted">
        Un aperçu — des milliers d'icônes Lucide (licence libre) sont déjà incluses.
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        {ICONS.map(({ Icon, name }) => (
          <div
            key={name}
            title={name}
            className="grid h-14 w-14 place-items-center rounded-lg border border-border/60 bg-surface text-ink-soft shadow-soft"
          >
            <Icon size={22} />
          </div>
        ))}
      </div>
    </div>
  );
}
