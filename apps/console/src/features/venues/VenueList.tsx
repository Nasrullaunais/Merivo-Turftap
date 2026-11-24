import { Link } from "@tanstack/react-router";
import { MapPin, Phone, PowerOff } from "lucide-react";
import type { ReactNode } from "react";

import { EmptyLine } from "../../components/Section";
import { ROW_LINK, Row, Rows } from "../../components/Rows";
import { useFirstIds } from "../../components/useFirstIds";
import { SkeletonRows } from "../../components/SkeletonRows";
import { StatePill } from "../../components/StatePill";
import { TopicTile } from "../../components/TopicTile";
import m from "../../i18n/en/venues";
import { useVenues } from "./useVenues";

/** The tenant's venues in one panel; `addSlot` is the add form at its foot, for Owners. */
export function VenueList({ addSlot }: { addSlot?: ReactNode }) {
  const { data: venues, isPending } = useVenues();

  return (
    <div className="overflow-hidden tt-panel">
      {isPending && (
        <div className="p-3">
          <SkeletonRows label={m.loading} />
        </div>
      )}
      {venues?.length === 0 && <EmptyLine>{m.none}</EmptyLine>}
      {!!venues?.length && <VenueRows venues={venues} />}
      {addSlot}
    </div>
  );
}

function VenueRows({ venues }: { venues: NonNullable<ReturnType<typeof useVenues>["data"]> }) {
  const isNew = useFirstIds(venues.map((venue) => venue.id));
  return (
    <Rows>
      {venues.map((venue, index) => (
        <Row
          key={venue.id}
          index={index}
          landed={isNew(venue.id)}
          lead={<TopicTile hue="place" icon={MapPin} size={36} />}
          title={
            <Link
              to="/venues/$venueId"
              params={{ venueId: venue.id }}
              data-row-link
              className={ROW_LINK}
            >
              {venue.name}
            </Link>
          }
          detail={
            <>
              <span className="truncate">{venue.address}</span>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Phone aria-hidden size={13} />
                {venue.phone}
              </span>
            </>
          }
          end={!venue.active && <StatePill tone="off" icon={PowerOff} label={m.turnedOff} />}
        />
      ))}
    </Rows>
  );
}
