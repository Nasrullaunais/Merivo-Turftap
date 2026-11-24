import { createFileRoute, redirect } from "@tanstack/react-router";
import { CalendarDays, CalendarPlus } from "lucide-react";
import { useState } from "react";

import { FormModal } from "../../../components/FormModal";
import { canOpen } from "../../../config/routePermissions";
import { BookingDetails } from "../../../features/bookings/BookingDetails";
import { BookingCalendar } from "../../../features/calendar/BookingCalendar";
import type { BookingPress, SlotPress } from "../../../features/calendar/CalendarGrid";
import { WalkInForm } from "../../../features/walk-ins/WalkInForm";
import m from "../../../i18n/en/calendar";
import walkIns from "../../../i18n/en/walkIns";
import { PageLayout } from "../../../layout/PageLayout";
import { can } from "../../../lib/tenant/activeTenant";

export const Route = createFileRoute("/_signedIn/_tenant/calendar")({
  beforeLoad: ({ context }) => {
    if (!canOpen(context.tenant, "/calendar")) throw redirect({ to: "/" });
  },
  component: CalendarPage,
});

type Slot = Parameters<SlotPress>[0];
type PressedBooking = Parameters<BookingPress>[0];

/** A window that keeps showing what it last opened while it fades out after closing. */
function useWindow<T>() {
  const [shown, setShown] = useState<T>();
  const [isOpen, setOpen] = useState(false);
  const open = (pressed: T) => {
    setShown(pressed);
    setOpen(true);
  };
  return { shown, isOpen, setOpen, open };
}

function CalendarPage() {
  const { tenant } = Route.useRouteContext();
  const walkIn = useWindow<Slot>();
  const details = useWindow<PressedBooking>();
  const slot = walkIn.shown;
  const pressed = details.shown;

  return (
    <PageLayout title={m.title} width="fill">
      <BookingCalendar
        onSlotPress={can(tenant, "bookings:create") ? walkIn.open : undefined}
        onBookingPress={details.open}
      />
      <FormModal
        isOpen={walkIn.isOpen}
        onOpenChange={walkIn.setOpen}
        hue="booking"
        icon={CalendarPlus}
        title={walkIns.title}
      >
        {slot && (
          <WalkInForm
            key={`${slot.resource.id}-${slot.startsAt}`}
            {...slot}
            onBooked={() => walkIn.setOpen(false)}
          />
        )}
      </FormModal>
      <FormModal
        isOpen={details.isOpen}
        onOpenChange={details.setOpen}
        hue="booking"
        icon={CalendarDays}
        title={pressed?.booking.customerName ?? ""}
        size="lg"
      >
        {pressed && <BookingDetails key={pressed.booking.id} {...pressed} tenant={tenant} />}
      </FormModal>
    </PageLayout>
  );
}
