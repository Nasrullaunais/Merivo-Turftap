import { createFileRoute, redirect } from "@tanstack/react-router";

import { MyBookings } from "../features/my-bookings/MyBookings";
import { SHOWS, type Show } from "../features/my-bookings/shows";
import { isSignedIn } from "../lib/auth/session";

type Search = { show?: Show };

/** POR-04: the customer's own bookings and memberships. */
export const Route = createFileRoute("/me")({
  validateSearch: (search): Search =>
    SHOWS.includes(search.show as Show) ? { show: search.show as Show } : {},
  beforeLoad: ({ location }) => {
    if (!isSignedIn()) throw redirect({ to: "/sign-in", search: { back: location.href } });
  },
  component: MePage,
});

function MePage() {
  const { show = "upcoming" } = Route.useSearch();
  return <MyBookings show={show} />;
}
