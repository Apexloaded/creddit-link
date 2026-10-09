import { routes } from "@/lib/route";
import {
  BookOpenIcon,
  CompassIcon,
  DatabaseIcon,
  HistoryIcon,
  LayoutDashboardIcon,
  LucideIcon,
  RadioIcon,
  TrendingUpIcon,
} from "lucide-react";

export interface NavSubItem {
  title?: string;
  name?: string;
  url: string;
}

export interface NavItem {
  title?: string;
  name?: string;
  url: string;
  icon?: LucideIcon;
  isActive?: boolean;
  items?: NavSubItem[];
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export const navItems: NavGroup[] = [
  {
    // Unlabeled group for primary app views
    items: [
      {
        title: "Dashboard",
        url: routes.app.dashboard,
        icon: LayoutDashboardIcon,
        isActive: true,
      },
      {
        title: "Activity",
        url: "#",
        icon: HistoryIcon,
      },
      {
        title: "Positions",
        url: routes.app.positions.index,
        icon: BookOpenIcon,
      },
    ],
  },
  {
    label: "Explore",
    items: [
      {
        title: "Markets",
        url: routes.app.dashboard,
        icon: TrendingUpIcon,
      },
      {
        title: "Explorer",
        url: "#",
        icon: CompassIcon,
      },
    ],
  },
  {
    label: "Mock Admin",
    items: [
      {
        title: "Mock Oracle",
        url: routes.app.admin.mockFeed,
        icon: RadioIcon,
      },
      {
        title: "Mock Registry",
        url: routes.app.admin.mockRegistry,
        icon: DatabaseIcon,
      },
    ],
  },
] as const;
