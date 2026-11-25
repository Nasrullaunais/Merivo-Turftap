import {
  BadgeCheck,
  CalendarDays,
  DoorOpen,
  type LucideIcon,
  MapPin,
  ReceiptText,
  Users,
} from "lucide-react";

import type { Hue } from "../components/look";
import { useWaitingCount } from "../features/receipts/useReceiptChecks";
import m from "../i18n/en/shell";
import type { GuardedRoute } from "./routePermissions";

export type NavPage = { label: string; to: GuardedRoute };

export type NavSection = {
  label: string;
  icon: LucideIcon;
  hue: Hue;
  /** With `pages`, the first of them the person may open. */
  to: GuardedRoute;
  /** Sub-pages that fold under the section (console-design.md §5.1). */
  pages?: NavPage[];
  /** Pages that count as being in this section. */
  isIn: (pathname: string) => boolean;
  /** How many things wait for someone to act; zero shows no badge. */
  useCount?: () => number | undefined;
};

const under =
  (...prefixes: string[]) =>
  (pathname: string) =>
    prefixes.some((prefix) => pathname.startsWith(prefix));

/** Sidebar groups, in order: desk work, selling, then setting up (console-design.md §5.1). */
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
    {
      label: m.nav.checkIns,
      icon: DoorOpen,
      hue: "membership",
      to: "/check-ins",
      isIn: under("/check-ins"),
    },
  ],
  [
    {
      label: m.nav.memberships,
      icon: BadgeCheck,
      hue: "membership",
      to: "/memberships",
      pages: [
        { label: m.nav.memberships, to: "/memberships" },
        { label: m.nav.membershipPlans, to: "/membership-plans" },
      ],
      isIn: under("/memberships", "/membership-plans"),
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
