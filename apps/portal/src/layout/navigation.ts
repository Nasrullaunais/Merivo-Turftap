import { useRouterState } from "@tanstack/react-router";
import { Store, Ticket, type LucideIcon } from "lucide-react";

import m from "../i18n/en/shell";

type Section = { to: "/" | "/me"; label: string; icon: LucideIcon };

/** POR-05: the two places a customer moves between, in the bottom nav and the top bar. */
export const SECTIONS: Section[] = [
  { to: "/", label: m.nav.venues, icon: Store },
  { to: "/me", label: m.nav.myBookings, icon: Ticket },
];

const MINE = /^\/(me|bookings|memberships)(\/|$)/;

/** Which section the page belongs to: a booking's or membership's own page counts as My bookings. */
export function useSectionIndex() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return MINE.test(pathname) ? 1 : 0;
}
