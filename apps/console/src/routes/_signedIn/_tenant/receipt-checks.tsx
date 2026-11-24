import { createFileRoute, redirect } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";
import { useState } from "react";

import { FormModal } from "../../../components/FormModal";
import { canOpen } from "../../../config/routePermissions";
import { BookingById } from "../../../features/bookings/BookingById";
import { ReceiptQueue } from "../../../features/receipts/ReceiptQueue";
import m from "../../../i18n/en/receipts";
import { PageLayout } from "../../../layout/PageLayout";

export const Route = createFileRoute("/_signedIn/_tenant/receipt-checks")({
  beforeLoad: ({ context }) => {
    if (!canOpen(context.tenant, "/receipt-checks")) throw redirect({ to: "/" });
  },
  component: ReceiptChecksPage,
});

function ReceiptChecksPage() {
  const { tenant } = Route.useRouteContext();
  const [earlierId, setEarlierId] = useState<number>();
  const [isOpen, setOpen] = useState(false);
  const openEarlier = (bookingId: number) => {
    setEarlierId(bookingId);
    setOpen(true);
  };

  return (
    <PageLayout title={m.title}>
      <ReceiptQueue tenant={tenant} onOpenBooking={openEarlier} />
      <FormModal
        isOpen={isOpen}
        onOpenChange={setOpen}
        hue="booking"
        icon={CalendarDays}
        title={m.earlierBooking}
        size="lg"
      >
        {earlierId !== undefined && (
          <BookingById key={earlierId} bookingId={earlierId} tenant={tenant} />
        )}
      </FormModal>
    </PageLayout>
  );
}
