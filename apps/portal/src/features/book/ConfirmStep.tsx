import { Button, Skeleton, Spinner } from "@heroui/react";
import { amountDueOnline } from "@turftap/contract";
import type { Resource, Venue } from "@turftap/contract/client";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Hourglass } from "lucide-react";
import { useEffect, useEffectEvent } from "react";

import { BookingTicket } from "../../components/BookingTicket";
import { Journey } from "../../components/Journey";
import m from "../../i18n/en/booking";
import common from "../../i18n/en/common";
import { PriceLines } from "./PriceLines";
import { isAlreadyWaiting, isSlotGone, useBook } from "./useBook";
import { useQuote } from "./useQuote";
import { useWaitingBooking } from "./useWaitingBooking";

const MS_PER_MINUTE = 60_000;

type Props = {
  resource: Resource;
  venue: Venue;
  startsAt: string;
  count: number;
  customerName?: string;
  onBooked: (bookingId: number) => void;
  /** The time went to someone else, or can't be booked any more. */
  onSlotGone: () => void;
};

/** BKG-02: one look at what is booked and what to pay now, then one press to book. */
export function ConfirmStep(props: Props) {
  const { resource, venue, startsAt, count, customerName, onBooked, onSlotGone } = props;
  const quote = useQuote(resource.id, startsAt, count, venue.timeZone);
  const book = useBook();
  const waiting = useWaitingBooking(isAlreadyWaiting(book.error));
  const endsAt = new Date(
    Date.parse(startsAt) + count * resource.slotMinutes * MS_PER_MINUTE,
  ).toISOString();
  const gone = useEffectEvent(onSlotGone);
  const limit = common.lengthOf(venue.paymentTimeLimitMinutes);
  const lost = quote.data === null || quote.data?.free === false || isSlotGone(book.error);

  useEffect(() => {
    if (lost) gone();
  }, [lost]);

  const confirm = () =>
    book.mutate(
      { body: { resourceId: resource.id, startsAt, slots: count } },
      { onSuccess: (reply) => onBooked(reply.data.id) },
    );

  const price = quote.data?.price;
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-8">
      <div className="grid gap-5">
        <h1 className="animate-tt-rise text-2xl font-semibold tracking-tight [animation-delay:60ms]">
          {m.confirm.title}
        </h1>
        <div className="animate-tt-card-in [animation-delay:100ms]">
          <BookingTicket
            resource={resource}
            venueName={venue.name}
            startsAt={startsAt}
            endsAt={endsAt}
            timeZone={venue.timeZone}
            holder={customerName}
          />
        </div>
      </div>

      <section className="tt-panel grid animate-tt-card-in gap-6 p-5 [animation-delay:180ms] lg:sticky lg:top-20 lg:mt-13">
        {price ? (
          <PriceLines
            price={price}
            due={{ amount: amountDueOnline(price.amount, venue), currency: price.currency }}
            advancePercent={venue.advancePercent}
          />
        ) : (
          <div role="status" aria-label={m.loading} className="grid gap-3">
            <Skeleton className="h-7 w-full rounded-md" />
            <Skeleton className="h-7 w-full rounded-full" />
            <Skeleton className="h-12 w-full rounded-md" />
          </div>
        )}

        <div className="border-t border-[var(--tt-line)] pt-5">
          <Journey online={!venue.payAtVenue} at={0} timeLimit={limit} />
          {!venue.payAtVenue && <p className="sr-only">{m.confirm.timeLimit(limit)}</p>}
        </div>

        {isAlreadyWaiting(book.error) ? (
          <AlreadyWaiting bookingId={waiting.data?.id} />
        ) : (
          <Button
            fullWidth
            size="lg"
            className="group"
            isPending={book.isPending}
            isDisabled={!price || lost}
            onPress={confirm}
          >
            {book.isPending ? <Spinner color="current" size="sm" /> : m.confirm.submit}
            {!book.isPending && (
              <ArrowRight
                size={18}
                aria-hidden
                className="transition-transform group-hover:translate-x-0.5"
              />
            )}
          </Button>
        )}
      </section>
    </div>
  );
}

/** BKG-02: only one booking may wait for payment, so the way forward is to finish that one. */
function AlreadyWaiting({ bookingId }: { bookingId?: number }) {
  return (
    <div
      role="alert"
      className="tt-tone-watch grid animate-tt-nudge justify-items-start gap-3 rounded-xl bg-[color-mix(in_oklab,var(--tt-tone)_10%,var(--tt-panel))] p-4"
    >
      <span className="tt-status-badge !size-11 !rounded-xl">
        <Hourglass size={20} aria-hidden />
      </span>
      <div className="grid gap-1">
        <h2 className="font-semibold tracking-tight">{m.waiting.title}</h2>
        <p className="text-sm text-pretty text-muted">{m.waiting.body}</p>
      </div>
      {bookingId ? (
        <Link
          to="/bookings/$bookingId"
          params={{ bookingId }}
          className="tt-t1 group inline-flex h-10 animate-tt-fade items-center gap-1.5 rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground hover:bg-[var(--accent-hover)] active:scale-[0.97]"
        >
          {m.waiting.open}
          <ArrowRight
            size={16}
            aria-hidden
            className="transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      ) : (
        <Skeleton className="h-10 w-44 rounded-full" />
      )}
    </div>
  );
}
