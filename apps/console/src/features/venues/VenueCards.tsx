import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import type { Venue } from "@turftap/contract/client";
import { MapPin, Phone, PowerOff } from "lucide-react";

import { CARD_LINK, CardCell, CardGrid } from "../../components/CardGrid";
import { EmptyState } from "../../components/EmptyState";
import { SkeletonCards } from "../../components/SkeletonRows";
import { StatePill } from "../../components/StatePill";
import { TopicTile } from "../../components/TopicTile";
import { usePresence } from "../../components/usePresence";
import m from "../../i18n/en/venues";
import { TodayHours } from "./TodayHours";
import { useVenues } from "./useVenues";

const CARD_MIN = "19rem";

type Props = {
  /** The venue's cover photo, if it has one. */
  cover: (venueId: number) => ReactNode;
  /** What the venue holds, at the card's foot. */
  holds: (venueId: number) => ReactNode;
};

/** The tenant's venues as cards that open each venue's page. */
export function VenueCards(slots: Props) {
  const { data: venues, isPending } = useVenues();
  if (isPending) return <SkeletonCards label={m.loading} min={CARD_MIN} cover />;
  if (!venues?.length)
    return (
      <EmptyState hue="place" icon={MapPin}>
        {m.none}
      </EmptyState>
    );
  return <Cards venues={venues} {...slots} />;
}

function Cards({ venues, ...slots }: Props & { venues: Venue[] }) {
  const shown = usePresence(venues, (venue) => venue.id);
  return (
    <CardGrid label={m.title} min={CARD_MIN}>
      {shown.map((present, index) => (
        <CardCell key={present.key} present={present} index={index}>
          <VenueCard venue={present.item} {...slots} />
        </CardCell>
      ))}
    </CardGrid>
  );
}

function VenueCard({ venue, cover, holds }: Props & { venue: Venue }) {
  return (
    <article
      className={`group relative flex w-full flex-col overflow-hidden tt-card ${venue.active ? "" : "opacity-70"}`}
    >
      <div className="relative h-28 overflow-hidden tt-hue-place bg-[color-mix(in_oklab,var(--tt-hue)_10%,var(--tt-panel))]">
        <div
          aria-hidden
          className="absolute -end-10 -top-16 size-56 rounded-full bg-[color-mix(in_oklab,var(--tt-hue)_28%,transparent)] blur-3xl"
        />
        {cover(venue.id)}

        {!venue.active && (
          <StatePill
            tone="off"
            icon={PowerOff}
            label={m.turnedOff}
            className="absolute end-3 top-3 bg-[var(--tt-panel)]"
          />
        )}
      </div>
      <TopicTile
        hue="place"
        icon={MapPin}
        size={44}
        on
        className="relative z-[2] -mt-6 ms-4 rounded-xl shadow-lg ring-4 ring-[var(--tt-panel)]"
      />
      <div className="grid flex-1 gap-1 px-4 pt-2 pb-4">
        <Link
          to="/venues/$venueId"
          params={{ venueId: venue.id }}
          className={`truncate text-base font-semibold ${CARD_LINK}`}
        >
          {venue.name}
        </Link>
        <span className="truncate text-sm text-muted">{venue.address}</span>
        <span className="inline-flex items-center gap-1.5 text-sm text-muted tabular-nums">
          <Phone aria-hidden size={13} />
          {venue.phone}
        </span>
      </div>
      <div className="flex min-h-12 items-center gap-3 border-t border-[var(--tt-line)] px-4 py-2.5 text-sm">
        <TodayHours venue={venue} />
        <span className="ms-auto">{holds(venue.id)}</span>
      </div>
    </article>
  );
}
