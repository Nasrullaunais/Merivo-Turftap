import { Link } from "@tanstack/react-router";
import { Building2, ChevronRight, MapPin, Store } from "lucide-react";

import { CardSkeletons } from "../../components/CardSkeletons";
import { CoverPhoto } from "../../components/CoverPhoto";
import { arrivalDelay } from "../../components/look";
import m from "../../i18n/en/venues";
import { useVenues } from "./useVenues";

const CARDS_START_MS = 140;

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
          className="animate-tt-card-in"
          style={arrivalDelay(index, CARDS_START_MS)}
        >
          <Link
            to="/venues/$venueId"
            params={{ venueId: venue.id }}
            className="tt-card group flex h-full flex-col overflow-hidden outline-offset-2 active:scale-[0.98]"
          >
            <CoverPhoto of={{ venueId: venue.id }} alt={m.coverAlt(venue.name)} />
            <div className="grid flex-1 content-start gap-1.5 p-4">
              <div className="flex items-center gap-3">
                <span className="tt-tile tt-hue-place size-9 rounded-[10px]">
                  <Building2 size={18} aria-hidden />
                </span>
                <h2 className="min-w-0 flex-1 text-lg font-semibold tracking-tight">
                  {venue.name}
                </h2>
                <ChevronRight
                  size={20}
                  aria-hidden
                  className="shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-0.5"
                />
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
          </Link>
        </li>
      ))}
    </ul>
  );
}
