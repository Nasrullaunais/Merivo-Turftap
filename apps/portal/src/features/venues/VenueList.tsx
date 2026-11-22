import { Card, Spinner } from "@heroui/react";

import m from "../../i18n/en/venues";
import { useCoverPhoto } from "./useCoverPhoto";
import { useVenues } from "./useVenues";

function CoverPhoto({ venueId, venueName }: { venueId: number; venueName: string }) {
  const { data: cover } = useCoverPhoto(venueId);
  if (!cover) return null;
  return (
    <img
      src={cover.url}
      alt={m.coverAlt(venueName)}
      loading="lazy"
      className="aspect-video w-full rounded-lg object-cover"
    />
  );
}

export function VenueList() {
  const { data: venues, isPending } = useVenues();

  if (isPending) return <Spinner aria-label={m.loading} />;
  if (!venues?.length) return <p className="text-muted">{m.empty}</p>;

  return (
    <ul className="grid gap-3">
      {venues.map((venue) => (
        <li key={venue.id}>
          <Card>
            <CoverPhoto venueId={venue.id} venueName={venue.name} />
            <Card.Header>
              <Card.Title>{venue.name}</Card.Title>
              <Card.Description>{venue.address}</Card.Description>
            </Card.Header>
            {venue.description && <Card.Content>{venue.description}</Card.Content>}
          </Card>
        </li>
      ))}
    </ul>
  );
}
