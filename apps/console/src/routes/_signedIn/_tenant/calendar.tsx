import { createFileRoute, redirect } from "@tanstack/react-router";

import { canOpen } from "../../../config/routePermissions";
import { BookingCalendar } from "../../../features/calendar/BookingCalendar";
import m from "../../../i18n/en/calendar";

export const Route = createFileRoute("/_signedIn/_tenant/calendar")({
  beforeLoad: ({ context }) => {
    if (!canOpen(context.tenant, "/calendar")) throw redirect({ to: "/" });
  },
  component: CalendarPage,
});

function CalendarPage() {
  return (
    <main className="grid gap-6 p-6">
      <h1 className="text-2xl font-semibold">{m.title}</h1>
      <BookingCalendar />
    </main>
  );
}
