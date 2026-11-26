import { Skeleton } from "@heroui/react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Id } from "@turftap/contract";

import { NotFoundPanel } from "../../components/NotFoundPanel";
import { BookingView } from "../../features/pay/BookingView";
import { useBooking } from "../../features/pay/useBooking";
import { useResource } from "../../features/resources/useResource";
import { useVenue } from "../../features/venues/useVenue";
import m from "../../i18n/en/booking";
import { isSignedIn } from "../../lib/auth/session";

/** PAY-01, PAY-02: one of the customer's bookings: how to pay for it, or where it stands. */
export const Route = createFileRoute("/bookings/$bookingId")({
  params: {
    parse: ({ bookingId }) => ({ bookingId: Id.parse(Number(bookingId)) }),
    stringify: ({ bookingId }) => ({ bookingId: String(bookingId) }),
  },
  beforeLoad: ({ location }) => {
    if (!isSignedIn()) throw redirect({ to: "/sign-in", search: { back: location.href } });
  },
  component: BookingPage,
});

function BookingPage() {
  const { bookingId } = Route.useParams();
  const booking = useBooking(bookingId);
  const resource = useResource(booking.data?.resourceId);
  const venue = useVenue(booking.data?.venueId);

  if (booking.isError || resource.isError || venue.isError) {
    return <NotFoundPanel {...m.notFound} />;
  }
  if (!booking.data || !resource.data || !venue.data) {
    return (
      <div
        role="status"
        aria-label={m.loading}
        className="mx-auto grid w-full max-w-lg gap-6 lg:max-w-5xl lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8"
      >
        <div className="grid content-start gap-6">
          <div className="flex items-center gap-4">
            <Skeleton className="size-22 rounded-full" />
            <div className="grid flex-1 gap-2">
              <Skeleton className="h-8 w-56 rounded-md" />
              <Skeleton className="h-4 w-40 rounded-md" />
            </div>
          </div>
          <Skeleton className="h-14 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
        <Skeleton className="h-52 rounded-[1.25rem]" />
      </div>
    );
  }
  return <BookingView booking={booking.data} resource={resource.data} venue={venue.data} />;
}
