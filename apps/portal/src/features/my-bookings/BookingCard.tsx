import { Link } from "@tanstack/react-router";
import { phoneShown } from "@turftap/contract";
import type { Booking, Resource, Venue } from "@turftap/contract/client";
import { formatMoney, onVenueClock } from "@turftap/ui";
import { ChevronRight, CircleCheck, MapPin, Phone, ScanSearch, Store } from "lucide-react";
import { useRef, useState } from "react";

import { BOOKING_ICONS, BOOKING_TONES } from "../../components/bookingLook";
import { DayLeaf } from "../../components/BookingTicket";
import { TONE_CLASS } from "../../components/look";
import { TYPE_ICONS } from "../../components/resourceLook";
import bookingText from "../../i18n/en/booking";
import common from "../../i18n/en/common";
import m from "../../i18n/en/myBookings";
import slots from "../../i18n/en/slots";
import { CancelPanel } from "./CancelPanel";
import { PayTimer } from "./PayTimer";
import { useCancelBooking } from "./useCancelBooking";

const MS_PER_HOUR = 3_600_000;
const MS_PER_MINUTE = 60_000;
const MINUTES_PER_HOUR = 60;

type Props = {
  booking: Booking;
  resource: Resource | undefined;
  venue: Venue | undefined;
  now: number;
  style?: React.CSSProperties;
};

const QUIET_BUTTON =
  "tt-t1 inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--tt-line-strong)] px-4 text-sm font-medium hover:bg-[var(--tt-hover)] active:scale-[0.97]";

/** POR-04: one booking: what, when and its state, with what the customer can do about it now. */
export function BookingCard({ booking, resource, venue, now, style }: Props) {
  const [confirming, setConfirming] = useState(false);
  const cancel = useCancelBooking(booking.id);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const timeZone = venue?.timeZone ?? "UTC";
  const Stamp = BOOKING_ICONS[booking.status];
  const TypeIcon = resource ? TYPE_ICONS[resource.type] : Store;
  const finished = booking.status === "CANCELLED" || booking.status === "EXPIRED";
  const started = Date.parse(booking.startsAt) <= now;
  const cutOffAt = Date.parse(booking.startsAt) - booking.cancellationCutOffHours * MS_PER_HOUR;
  const minutes = (Date.parse(booking.endsAt) - Date.parse(booking.startsAt)) / MS_PER_MINUTE;

  // BKG-06: an unpaid booking can go any time; a confirmed one only before its Cancellation Cut-off.
  const canCancel =
    booking.status === "AWAITING_PAYMENT" || (booking.status === "CONFIRMED" && now < cutOffAt);
  const callInstead =
    !started &&
    (booking.status === "AWAITING_CHECK" || booking.status === "CONFIRMED") &&
    !canCancel;

  const close = () => {
    setConfirming(false);
    cancelButton.current?.focus();
  };

  return (
    <article
      style={{ viewTransitionName: `tt-booking-${booking.id}`, ...style }}
      aria-label={resource?.name ?? m.someResource}
      className={`tt-card animate-tt-card-in overflow-hidden ${finished ? "opacity-70" : ""}`}
    >
      <Link
        to="/bookings/$bookingId"
        params={{ bookingId: booking.id }}
        className="group flex items-center gap-4 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-inset"
      >
        <DayLeaf date={onVenueClock(booking.startsAt, timeZone).date} />
        <div className="grid min-w-0 flex-1 gap-x-2 gap-y-0.5 sm:grid-cols-[minmax(0,1fr)_auto]">
          <h3 className="flex min-w-0 items-center gap-2 font-semibold tracking-tight">
            <TypeIcon
              size={17}
              aria-hidden
              className="tt-hue-place shrink-0 text-[var(--tt-hue)]"
            />
            <span className="truncate">{resource?.name ?? m.someResource}</span>
          </h3>
          {/* On phones the state drops under the time, so a long one never gets cut off. */}
          <span
            key={booking.status}
            className={`${TONE_CLASS[BOOKING_TONES[booking.status]]} tt-pill animate-tt-pop justify-self-start max-sm:order-last max-sm:mt-1.5 sm:justify-self-end`}
          >
            <Stamp size={13} aria-hidden />
            {bookingText.status[booking.status]}
          </span>
          {venue && (
            <p className="flex items-center gap-1 truncate text-sm text-muted sm:col-span-2">
              <MapPin size={14} aria-hidden className="shrink-0" />
              {venue.name}
            </p>
          )}
          <p className="text-sm font-medium tabular-nums sm:col-span-2">
            {m.when(
              slots.range(booking.startsAt, booking.endsAt, timeZone),
              common.lengthOf(minutes),
            )}
          </p>
        </div>
        <ChevronRight
          size={18}
          aria-hidden
          className="shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-0.5"
        />
      </Link>

      {!finished && !started && (
        <div
          data-card-quiet
          className="mx-4 border-t border-dashed border-[var(--tt-line-strong)]"
        />
      )}
      {!finished && !started && (
        <div data-card-quiet className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3">
          <div className="grid min-w-0 flex-1 basis-48 gap-0.5">
            {booking.status === "AWAITING_PAYMENT" && booking.expiresAt && (
              <PayTimer expiresAt={booking.expiresAt} />
            )}
            {booking.status === "AWAITING_CHECK" && (
              <span className="tt-tone-busy tt-tone-text flex items-center gap-1.5 text-sm font-medium">
                <ScanSearch size={15} aria-hidden className="shrink-0" />
                {m.checking}
              </span>
            )}
            {booking.status === "CONFIRMED" && <Money booking={booking} />}
            {booking.status === "CONFIRMED" && canCancel && (
              <span className="text-xs text-muted">
                {m.cancelUntil(
                  slots.clock(new Date(cutOffAt).toISOString(), timeZone),
                  slots.shortDate(onVenueClock(new Date(cutOffAt), timeZone).date),
                )}
              </span>
            )}
            {callInstead && (
              <span className="text-xs text-pretty text-muted">
                {booking.status === "AWAITING_CHECK"
                  ? m.callToCancel.checking
                  : m.callToCancel.pastCutOff(
                      common.lengthOf(booking.cancellationCutOffHours * MINUTES_PER_HOUR),
                    )}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2 max-sm:w-full max-sm:justify-end">
            {canCancel && (
              <button
                ref={cancelButton}
                type="button"
                aria-expanded={confirming}
                onClick={() => setConfirming(true)}
                className={`${QUIET_BUTTON} aria-expanded:bg-[var(--tt-hover)]`}
              >
                {m.cancel}
              </button>
            )}
            {callInstead && venue && (
              <a href={`tel:${venue.phone}`} className={QUIET_BUTTON}>
                <Phone size={15} aria-hidden />
                {m.call(phoneShown(venue.phone))}
              </a>
            )}
            {booking.status === "AWAITING_PAYMENT" && (
              <Link
                to="/bookings/$bookingId"
                params={{ bookingId: booking.id }}
                className="tt-hue-money tt-t1 inline-flex h-9 items-center rounded-full bg-[var(--tt-hue)] px-4 text-sm font-medium text-white hover:bg-[color-mix(in_oklab,var(--tt-hue)_88%,black)] active:scale-[0.97]"
              >
                {m.sendReceipt}
              </Link>
            )}
          </div>
        </div>
      )}
      {canCancel && (
        <CancelPanel
          title={m.confirmCancel.title}
          body={m.confirmCancel.body}
          paid={booking.paid}
          open={confirming}
          cancelling={cancel.isPending}
          onKeep={close}
          onCancel={() => cancel.mutate()}
        />
      )}
    </article>
  );
}

/** What is left to pay at the venue, or that it is all paid. */
function Money({ booking }: { booking: Booking }) {
  if (booking.balance.amount === 0) {
    return (
      <span className="tt-tone-good tt-tone-text flex items-center gap-1.5 text-sm font-medium">
        <CircleCheck size={15} aria-hidden className="shrink-0" />
        {m.paid}
      </span>
    );
  }
  return (
    <span className="tt-hue-money flex items-center gap-1.5 text-sm font-medium text-[var(--tt-hue)] tabular-nums">
      <Store size={15} aria-hidden className="shrink-0" />
      {m.balance(formatMoney(booking.balance))}
    </span>
  );
}
