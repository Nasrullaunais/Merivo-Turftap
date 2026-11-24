import { createFileRoute, redirect } from "@tanstack/react-router";

import { canOpen } from "../../../config/routePermissions";
import { BookingCalendar } from "../../../features/calendar/BookingCalendar";
import m from "../../../i18n/en/calendar";
import { PageLayout } from "../../../layout/PageLayout";

export const Route = createFileRoute("/_signedIn/_tenant/calendar")({
  beforeLoad: ({ context }) => {
    if (!canOpen(context.tenant, "/calendar")) throw redirect({ to: "/" });
  },
  component: CalendarPage,
});

function CalendarPage() {
  return (
    <PageLayout title={m.title} width="fill">
      <BookingCalendar />
    </PageLayout>
  );
}
