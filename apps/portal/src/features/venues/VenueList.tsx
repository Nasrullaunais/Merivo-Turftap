import { Card, Spinner } from "@heroui/react";

import m from "../../i18n/en/venues";
import { useVenues } from "./useVenues";

export function VenueList() {
  const { data: venues, isPending } = useVenues();

  if (isPending) return <Spinner aria-label={m.loading} />;
  if (!venues?.length) return <p className="text-muted">{m.empty}</p>;

  return (
    <ul className="grid gap-3">
      {venues.map((venue) => (
        <li key={venue.id}>
          <Card>
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
