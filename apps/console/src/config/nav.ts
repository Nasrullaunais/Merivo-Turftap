import { CalendarDays, type LucideIcon, MapPin, Users } from "lucide-react";

import type { Hue } from "../components/look";
import m from "../i18n/en/shell";
import type { GuardedRoute } from "./routePermissions";

export type NavSection = {
  label: string;
  icon: LucideIcon;
  hue: Hue;
  to: GuardedRoute;
  /** Pages that count as being in this section. */
  isIn: (pathname: string) => boolean;
};

const under =
  (...prefixes: string[]) =>
  (pathname: string) =>
    prefixes.some((prefix) => pathname.startsWith(prefix));

/** Sidebar groups, in order: desk work, then setting up (console-design.md §5.1). */
export const NAV_GROUPS: NavSection[][] = [
  [
    {
      label: m.nav.calendar,
      icon: CalendarDays,
      hue: "booking",
      to: "/calendar",
      isIn: under("/calendar"),
    },
  ],
  [
    {
      label: m.nav.venues,
      icon: MapPin,
      hue: "place",
      to: "/venues",
      isIn: under("/venues", "/resources"),
    },
    { label: m.nav.staff, icon: Users, hue: "people", to: "/staff", isIn: under("/staff") },
  ],
];
