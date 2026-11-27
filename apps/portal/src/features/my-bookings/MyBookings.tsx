import { Skeleton } from "@heroui/react";
import { Link } from "@tanstack/react-router";
import type { Booking, Membership } from "@turftap/contract/client";
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  History,
  LoaderCircle,
  type LucideIcon,
  WifiOff,
} from "lucide-react";
import { useState } from "react";

import { arrivalDelay } from "../../components/look";
import m from "../../i18n/en/myBookings";
import { useNow } from "../../lib/time/useNow";
import { BookingCard } from "./BookingCard";
import { MembershipCard } from "./MembershipCard";
import { SHOWS, type Show } from "./shows";
import { ShowSwitch } from "./ShowSwitch";
import { useMyMemberships, usePastBookings, useUpcomingBookings } from "./useMyBookings";
import { usePlaces } from "./usePlaces";

/** Cut-off and started checks move on while the page stays open. */
const CLOCK_TICK_MS = 30_000;
const CARDS_START_MS = 140;

const isLive = (booking: Booking) => booking.status !== "CANCELLED" && booking.status !== "EXPIRED";

/** POR-04: the customer's bookings and memberships, one list at a time. */
export function MyBookings({ show }: { show: Show }) {
  const [openedAt] = useState(() => new Date().toISOString());
  const now = useNow(CLOCK_TICK_MS);
  const { venues, resources } = usePlaces();
  const upcoming = useUpcomingBookings(openedAt);
  const past = usePastBookings(openedAt, show === "past");
  const memberships = useMyMemberships();

  const hasGym = [...(venues.data?.values() ?? [])].some((venue) => venue.hasGym);
  const showMemberships = hasGym || (memberships.data?.length ?? 0) > 0;
  const shown: Show = show === "memberships" && !showMemberships ? "upcoming" : show;
  const tabs = SHOWS.filter((tab) => tab !== "memberships" || showMemberships);
  const counts: Partial<Record<Show, number>> = {
    upcoming: upcoming.data?.filter(isLive).length,
    memberships: memberships.data?.filter((x) => x.status === "ACTIVE").length,
  };

  const placesReady = venues.data && resources.data;
  const card = (booking: Booking, index: number) => (
    <BookingCard
      key={booking.id}
      booking={booking}
      resource={resources.data?.get(booking.resourceId)}
      venue={venues.data?.get(booking.venueId)}
      now={now}
      style={arrivalDelay(index, CARDS_START_MS)}
    />
  );

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-5">
      <h1 className="animate-tt-rise text-2xl font-semibold tracking-tight [animation-delay:60ms]">
        {m.title}
      </h1>
      <ShowSwitch tabs={tabs} shown={shown} counts={counts} />

      <div key={shown} className="grid animate-tt-fade gap-3">
        {shown === "upcoming" &&
          (upcoming.isError ? (
            <Failed onRetry={() => void upcoming.refetch()} />
          ) : !upcoming.data || !placesReady ? (
            <CardsLoading />
          ) : upcoming.data.length === 0 ? (
            <Empty icon={CalendarClock} {...m.empty.upcoming} />
          ) : (
            <UpcomingList bookings={upcoming.data} card={card} />
          ))}

        {shown === "past" &&
          (past.isError ? (
            <Failed onRetry={() => void past.refetch()} />
          ) : !past.data || !placesReady ? (
            <CardsLoading />
          ) : past.data.length === 0 ? (
            <Empty icon={History} {...m.empty.past} />
          ) : (
            <>
              {past.data.map(card)}
              {past.hasNextPage && (
                <button
                  type="button"
                  onClick={() => void past.fetchNextPage()}
                  disabled={past.isFetchingNextPage}
                  className="tt-t1 mx-auto inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-medium text-accent hover:bg-[var(--tt-hover)] active:scale-[0.97]"
                >
                  {past.isFetchingNextPage && (
                    <LoaderCircle size={16} aria-hidden className="animate-spin" />
                  )}
                  {m.older}
                </button>
              )}
            </>
          ))}

        {shown === "memberships" &&
          (memberships.isError ? (
            <Failed onRetry={() => void memberships.refetch()} />
          ) : !memberships.data || !venues.data ? (
            <CardsLoading />
          ) : memberships.data.length === 0 ? (
            <Empty icon={BadgeCheck} {...m.empty.memberships} />
          ) : (
            [...memberships.data]
              .sort((a, b) => Number(isFinishedMembership(a)) - Number(isFinishedMembership(b)))
              .map((membership, index) => (
                <MembershipCard
                  key={membership.id}
                  membership={membership}
                  venue={venues.data.get(membership.venueId)}
                  renewedFrom={nextStartOf(membership, memberships.data)}
                  now={now}
                  style={arrivalDelay(index, CARDS_START_MS)}
                />
              ))
          ))}
      </div>
    </div>
  );
}

const isFinishedMembership = ({ status }: { status: string }) =>
  status === "EXPIRED" || status === "CANCELLED" || status === "ENDED";

/** MEM-04: the start of the next membership of the same plan, once this one has been renewed. */
const nextStartOf = (membership: Membership, all: Membership[]) =>
  all
    .filter(
      (other) =>
        other.planId === membership.planId &&
        other.startsOn > membership.endsOn &&
        !isFinishedMembership(other),
    )
    .map((other) => other.startsOn)
    .sort()[0];

/** Live bookings first; cancelled and expired ones wait quietly under their own heading. */
function UpcomingList({
  bookings,
  card,
}: {
  bookings: Booking[];
  card: (booking: Booking, index: number) => React.ReactNode;
}) {
  const live = bookings.filter(isLive);
  const finished = bookings.filter((booking) => !isLive(booking));
  return (
    <>
      {live.length === 0 && <Empty icon={CalendarClock} {...m.empty.upcoming} />}
      {live.map(card)}
      {finished.length > 0 && (
        <h2
          style={{ viewTransitionName: "tt-finished-heading" }}
          className="mt-4 text-sm font-medium text-muted"
        >
          {m.finished}
        </h2>
      )}
      {finished.map((booking, index) => card(booking, live.length + index))}
    </>
  );
}

function CardsLoading() {
  return (
    <div role="status" aria-label={m.loading} className="grid gap-3">
      {[0, 1, 2].map((index) => (
        <div key={index} className="tt-panel flex items-center gap-4 rounded-2xl p-4">
          <Skeleton className="h-[4.25rem] w-14 rounded-xl" />
          <div className="grid flex-1 gap-2">
            <Skeleton className="h-4 w-40 rounded-md" />
            <Skeleton className="h-3 w-28 rounded-md" />
            <Skeleton className="h-3 w-48 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

function Empty({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: string;
}) {
  return (
    <section className="tt-panel grid animate-tt-rise justify-items-center gap-2 rounded-2xl px-6 py-10 text-center">
      <span className="tt-tile tt-hue-booking mb-1 size-14 animate-tt-pop rounded-2xl">
        <Icon size={26} aria-hidden />
      </span>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="max-w-xs text-sm text-pretty text-muted">{body}</p>
      {action && (
        <Link
          to="/"
          className="tt-t1 group mt-2 inline-flex h-10 items-center gap-1.5 rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground hover:bg-[var(--accent-hover)] active:scale-[0.97]"
        >
          {action}
          <ArrowRight
            size={16}
            aria-hidden
            className="transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      )}
    </section>
  );
}

function Failed({ onRetry }: { onRetry: () => void }) {
  return (
    <section className="tt-tone-bad tt-panel grid animate-tt-rise justify-items-center gap-2 rounded-2xl px-6 py-10 text-center">
      <span className="tt-status-badge mb-1 !size-14 !rounded-2xl">
        <WifiOff size={26} strokeWidth={1.75} aria-hidden />
      </span>
      <h2 className="text-lg font-semibold tracking-tight">{m.failed}</h2>
      <button
        type="button"
        onClick={onRetry}
        className="tt-t1 mt-1 inline-flex h-10 items-center rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground hover:bg-[var(--accent-hover)] active:scale-[0.97]"
      >
        {m.retry}
      </button>
    </section>
  );
}
