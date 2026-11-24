import { useQuery } from "@tanstack/react-query";
import type { MyTenant } from "@turftap/contract";
import {
  getBookingOptions,
  getResourceOptions,
  getVenueOptions,
} from "@turftap/contract/client/react-query";

import { SkeletonRows } from "../../components/SkeletonRows";
import m from "../../i18n/en/bookings";
import { BookingDetails } from "./BookingDetails";

/** A booking's details when only its id is known, such as the one a reused receipt paid for. */
export function BookingById({ bookingId, tenant }: { bookingId: number; tenant?: MyTenant }) {
  const booking = useQuery({
    ...getBookingOptions({ path: { id: bookingId } }),
    select: (reply) => reply.data,
  });
  const resource = useQuery({
    ...getResourceOptions({ path: { id: booking.data?.resourceId ?? 0 } }),
    enabled: booking.data !== undefined,
    select: (reply) => reply.data,
  });
  const venue = useQuery({
    ...getVenueOptions({ path: { id: booking.data?.venueId ?? 0 } }),
    enabled: booking.data !== undefined,
    select: (reply) => reply.data,
  });

  if (booking.isError) return null;
  if (!booking.data || !resource.data || !venue.data)
    return <SkeletonRows label={m.loadingBooking} rows={3} />;
  return (
    <div className="grid gap-4">
      <h3 className="text-lg font-semibold">{booking.data.customerName}</h3>
      <BookingDetails
        booking={booking.data}
        resource={resource.data}
        timeZone={venue.data.timeZone}
        tenant={tenant}
      />
    </div>
  );
}
