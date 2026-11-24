import { CalendarDays, type LucideIcon, MapPin, ReceiptText, Users } from "lucide-react";

import type { Hue } from "../components/look";
import { useWaitingCount } from "../features/receipts/useReceiptChecks";
import m from "../i18n/en/shell";
import type { GuardedRoute } from "./routePermissions";

export type NavSection = {
  label: string;
  icon: LucideIcon;
  hue: Hue;
  to: GuardedRoute;
  /** Pages that count as being in this section. */
  isIn: (pathname: string) => boolean;
  /** How many things wait for someone to act; zero shows no badge. */
  useCount?: () => number | undefined;
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
    {
      label: m.nav.receiptChecks,
      icon: ReceiptText,
      hue: "money",
      to: "/receipt-checks",
      isIn: under("/receipt-checks"),
      useCount: () => useWaitingCount().data,
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
