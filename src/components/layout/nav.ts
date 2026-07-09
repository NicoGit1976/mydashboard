import {
  FileText,
  Images,
  LayoutDashboard,
  Plug,
  Settings,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { label: string; icon: LucideIcon; href: string };

const NAV: NavItem[] = [
  { label: "Vue d'ensemble", icon: LayoutDashboard, href: "/overview" },
  { label: "Clients", icon: Users, href: "/clients" },
  { label: "Rapports", icon: FileText, href: "/reports" },
  { label: "Sources de données", icon: Plug, href: "/sources" },
  { label: "Bibliothèque", icon: Images, href: "/library" },
  { label: "Réglages", icon: Settings, href: "/settings" },
];

const ADMIN_NAV: NavItem[] = [{ label: "Équipe", icon: UserCog, href: "/team" }];

// Admins get "Équipe" inserted just before "Réglages".
export function navFor(isAdmin: boolean): NavItem[] {
  return isAdmin ? [...NAV.slice(0, 5), ...ADMIN_NAV, ...NAV.slice(5)] : NAV;
}
