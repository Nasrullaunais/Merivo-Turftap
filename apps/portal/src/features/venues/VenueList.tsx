import { Building2, MapPin, Store } from "lucide-react";
import { useState } from "react";

import { CardSkeletons } from "../../components/CardSkeletons";
import { arrivalDelay } from "../../components/look";
import m from "../../i18n/en/venues";
import { useCoverPhoto } from "./useCoverPhoto";
import { useVenues } from "./useVenues";

const CARDS_START_MS = 140;

function CoverPhoto({ venueId, venueName }: { venueId: number; venueName: string }) {
  const { data: cover, isPending } = useCoverPhoto(venueId);
  const [loaded, setLoaded] = useState(false);
  if (!isPending && !cover) return null;
  return (
    <div className="tt-cover aspect-video w-full overflow-hidden">
      {cover && (
        <img
          src={cover.url}
          alt={m.coverAlt(venueName)}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          data-loaded={loaded}
          className="tt-cover-img size-full object-cover"
        />
      )}
    </div>
  );
}

export function VenueList() {
  const { data: venues, isPending } = useVenues();

  if (isPending) return <CardSkeletons label={m.loading} />;
  if (!venues?.length) {
    return (
      <div className="tt-panel grid animate-tt-rise justify-items-center gap-3 px-6 py-12 text-center">
        <span className="tt-tile tt-hue-place size-12 rounded-xl">
          <Store size={24} aria-hidden />
        </span>
        <p className="text-muted">{m.empty}</p>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {venues.map((venue, index) => (
        <li
          key={venue.id}
          className="tt-card animate-tt-card-in overflow-hidden"
          style={arrivalDelay(index, CARDS_START_MS)}
        >
          <CoverPhoto venueId={venue.id} venueName={venue.name} />
          <div className="grid gap-1.5 p-4">
            <div className="flex items-center gap-3">
              <span className="tt-tile tt-hue-place size-9 rounded-[10px]">
                <Building2 size={18} aria-hidden />
              </span>
              <h2 className="min-w-0 text-lg font-semibold tracking-tight">{venue.name}</h2>
            </div>
            <p className="flex items-start gap-2 text-sm text-muted">
              <MapPin
                size={16}
                aria-hidden
                className="tt-hue-place mt-0.5 shrink-0 text-[var(--tt-hue)]"
              />
              {venue.address}
            </p>
            {venue.description && <p className="pt-1 text-sm text-pretty">{venue.description}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}
