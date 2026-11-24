import { Chip } from "@heroui/react";
import { Link } from "@tanstack/react-router";

import { SkeletonRows } from "../../components/SkeletonRows";
import m from "../../i18n/en/venues";
import { useVenues } from "./useVenues";

export function VenueList() {
  const { data: venues, isPending } = useVenues();

  if (isPending) return <SkeletonRows label={m.loading} />;
  if (!venues?.length) return <p className="text-muted">{m.none}</p>;

  return (
    <ul className="grid divide-y divide-separator">
      {venues.map((venue) => (
        <li key={venue.id} className="flex flex-wrap items-center gap-x-3 py-2">
          <Link
            to="/venues/$venueId"
            params={{ venueId: venue.id }}
            className="font-medium underline-offset-4 hover:underline"
          >
            {venue.name}
          </Link>
          <span className="text-muted">{venue.address}</span>
          <span>{venue.phone}</span>
          {!venue.active && <Chip size="sm">{m.turnedOff}</Chip>}
        </li>
      ))}
    </ul>
  );
}
