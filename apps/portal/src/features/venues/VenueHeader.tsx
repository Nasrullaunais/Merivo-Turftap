import { Skeleton } from "@heroui/react";
import { MapPin } from "lucide-react";

import { CoverPhoto } from "../../components/CoverPhoto";
import m from "../../i18n/en/venues";
import { useVenue } from "./useVenue";

/** The top of a venue's page: its cover photo, name, address and description. */
export function VenueHeader({ venueId }: { venueId: number }) {
  const { data: venue } = useVenue(venueId);

  if (!venue) {
    return (
      <div role="status" aria-label={m.loadingVenue} className="grid gap-3">
        <Skeleton className="aspect-[21/9] w-full rounded-2xl" />
        <Skeleton className="h-8 w-56 rounded-md" />
        <Skeleton className="h-4 w-72 max-w-full rounded-md" />
      </div>
    );
  }

  return (
    <header className="grid gap-3">
      <CoverPhoto
        of={{ venueId }}
        alt={m.coverAlt(venue.name)}
        className="aspect-video animate-tt-fade rounded-2xl sm:aspect-[21/9]"
      />
      <h1 className="animate-tt-rise text-2xl font-semibold tracking-tight text-balance [animation-delay:60ms] sm:text-3xl">
        {venue.name}
      </h1>
      <p className="flex animate-tt-rise items-start gap-2 text-sm text-muted [animation-delay:100ms]">
        <MapPin
          size={16}
          aria-hidden
          className="tt-hue-place mt-0.5 shrink-0 text-[var(--tt-hue)]"
        />
        {venue.address}
      </p>
      {venue.description && (
        <p className="max-w-prose animate-tt-rise text-pretty [animation-delay:140ms]">
          {venue.description}
        </p>
      )}
    </header>
  );
}
