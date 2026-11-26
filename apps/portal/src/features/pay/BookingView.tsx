import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { Booking, Resource, Venue } from "@turftap/contract/client";
import { getBookingQueryKey } from "@turftap/contract/client/react-query";
import { formatMoney } from "@turftap/ui";
import { ArrowRight } from "lucide-react";
import { useEffect } from "react";

import { BOOKING_ICONS, BOOKING_TONES } from "../../components/bookingLook";
import { BookingTicket } from "../../components/BookingTicket";
import { Journey } from "../../components/Journey";
import { TONE_CLASS } from "../../components/look";
import m from "../../i18n/en/booking";
import { Outcome } from "./Outcome";
import { PaySteps } from "./PaySteps";
import { useNow } from "../../lib/time/useNow";

const TICK_MS = 1000;

type Props = { booking: Booking; resource: Resource; venue: Venue };

/** PAY-01, PAY-02: what the customer does next with a booking, or where it stands. */
export function BookingView({ booking, resource, venue }: Props) {
  const now = useNow(TICK_MS);
  const queryClient = useQueryClient();
  const leftMs = booking.expiresAt ? Date.parse(booking.expiresAt) - now : Infinity;
  const timedOut = booking.status === "AWAITING_PAYMENT" && leftMs <= 0;
  const view = timedOut ? "EXPIRED" : booking.status;

  useEffect(() => {
    if (timedOut)
      void queryClient.invalidateQueries({
        queryKey: getBookingQueryKey({ path: { id: booking.id } }),
      });
  }, [timedOut, booking.id, queryClient]);

  const Stamp = BOOKING_ICONS[view];
  const ticket = (
    <BookingTicket
      resource={resource}
      venueName={venue.name}
      startsAt={booking.startsAt}
      endsAt={booking.endsAt}
      timeZone={venue.timeZone}
      holder={booking.customerName}
      stamp={
        <span key={view} className={`${TONE_CLASS[BOOKING_TONES[view]]} tt-pill animate-tt-pop`}>
          <Stamp size={13} aria-hidden />
          {m.status[view]}
        </span>
      }
    />
  );

  if (view === "AWAITING_PAYMENT") {
    return (
      <div className="mx-auto grid w-full max-w-lg gap-6 lg:max-w-5xl lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-8">
        <PaySteps
          booking={booking}
          leftMs={leftMs}
          venuePhone={venue.phone}
          timeZone={venue.timeZone}
        />
        <aside className="animate-tt-card-in [animation-delay:280ms] lg:sticky lg:top-20">
          {ticket}
        </aside>
      </div>
    );
  }

  const again = (label: string) => (
    <Link
      to="/resources/$resourceId"
      params={{ resourceId: resource.id }}
      className="tt-t1 group inline-flex h-10 items-center gap-1.5 rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground hover:bg-[var(--accent-hover)] active:scale-[0.97]"
    >
      {label}
      <ArrowRight
        size={16}
        aria-hidden
        className="transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );
  const outcome = {
    AWAITING_CHECK: { ...m.done.checking },
    CONFIRMED: {
      title: m.done.booked.title,
      body:
        booking.balance.amount > 0
          ? m.done.booked.balance(formatMoney(booking.balance))
          : m.done.booked.paid,
    },
    EXPIRED: { ...m.done.expired, action: again(m.done.expired.again) },
    CANCELLED: {
      title: m.done.cancelled.title,
      body: booking.cancelReason ? m.done.cancelled.reason(booking.cancelReason) : undefined,
    },
  }[view];

  const online = booking.amountDue.amount > 0;
  const journeyAt =
    view === "AWAITING_CHECK" ? 3 : view === "CONFIRMED" ? (online ? 4 : 2) : undefined;
  return (
    <div key={view} className="mx-auto grid w-full max-w-lg gap-5">
      <Outcome tone={BOOKING_TONES[view]} icon={BOOKING_ICONS[view]} {...outcome} />
      {journeyAt !== undefined && (
        <div className="tt-panel animate-tt-rise p-5 [animation-delay:260ms]">
          <Journey online={online} at={journeyAt} checking={view === "AWAITING_CHECK"} />
        </div>
      )}
      <div className="animate-tt-card-in [animation-delay:320ms]">{ticket}</div>
    </div>
  );
}
