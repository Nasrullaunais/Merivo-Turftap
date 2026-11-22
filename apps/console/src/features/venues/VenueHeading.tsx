import { Spinner } from "@heroui/react";

import m from "../../i18n/en/venues";
import { useVenue } from "./useVenue";

export function VenueHeading({ venueId }: { venueId: number }) {
  const { data: venue } = useVenue(venueId);

  if (!venue) return <Spinner aria-label={m.loading} />;
  return (
    <header className="grid gap-1">
      <h1 className="text-2xl font-semibold">{venue.name}</h1>
      <p className="text-muted">{venue.address}</p>
    </header>
  );
}
