import { createFileRoute, redirect } from "@tanstack/react-router";
import { CalendarPlus } from "lucide-react";
import { useState } from "react";

import { FormModal } from "../../../components/FormModal";
import { canOpen } from "../../../config/routePermissions";
import { BookingCalendar } from "../../../features/calendar/BookingCalendar";
import type { SlotPress } from "../../../features/calendar/CalendarGrid";
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

function CalendarPage() {
  const { tenant } = Route.useRouteContext();
  const [slot, setSlot] = useState<Slot>();
  // The window keeps showing the last slot while it fades out after closing.
  const [isOpen, setOpen] = useState(false);
  const open = (pressed: Slot) => {
    setSlot(pressed);
    setOpen(true);
  };

  return (
    <PageLayout title={m.title} width="fill">
      <BookingCalendar onSlotPress={can(tenant, "bookings:create") ? open : undefined} />
      <FormModal
        isOpen={isOpen}
        onOpenChange={setOpen}
        hue="booking"
        icon={CalendarPlus}
        title={walkIns.title}
      >
        {slot && (
          <WalkInForm
            key={`${slot.resource.id}-${slot.startsAt}`}
            {...slot}
            onBooked={() => setOpen(false)}
          />
        )}
      </FormModal>
    </PageLayout>
  );
}
