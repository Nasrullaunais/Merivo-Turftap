import { Skeleton } from "@heroui/react";
import type { Venue } from "@turftap/contract/client";
import { MapPin, Phone } from "lucide-react";

import { Backdrop } from "../../components/Backdrop";
import { OpenPill } from "../../components/OpenPill";
import type { Offer } from "../../components/sportLook";
import m from "../../i18n/en/venues";

/** The top of a venue's page: its picture with the name, address, open hours and a call button on it. */
export function VenueHero({ venue, offers }: { venue?: Venue; offers?: Offer[] }) {
  if (!venue || !offers) {
    return (
      <div role="status" aria-label={m.loadingVenue}>
        <Skeleton className="aspect-[4/3] w-full rounded-3xl sm:aspect-[21/9]" />
      </div>
    );
  }
  return (
    <header className="relative isolate grid aspect-[4/3] animate-tt-fade content-end overflow-hidden rounded-3xl text-white sm:aspect-[21/9]">
      <Backdrop photoOf={{ venueId: venue.id }} scenes={offers} alt={m.coverAlt(venue.name)} />
      <div className="absolute top-4 left-4">
        <OpenPill venue={venue} />
      </div>
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3 p-5 sm:p-7">
        <div className="grid min-w-0 flex-1 basis-64 gap-1.5">
          <h1 className="animate-tt-rise text-3xl font-semibold tracking-tight text-balance [animation-delay:60ms] sm:text-4xl">
            {venue.name}
          </h1>
          <p className="flex animate-tt-rise items-start gap-1.5 text-sm text-white/80 [animation-delay:100ms]">
            <MapPin size={15} aria-hidden className="mt-0.5 shrink-0" />
            {venue.address}
          </p>
          {venue.description && (
            <p className="max-w-prose animate-tt-rise text-sm text-pretty text-white/90 [animation-delay:140ms]">
              {venue.description}
            </p>
          )}
        </div>
        <a
          href={`tel:${venue.phone}`}
          className="inline-flex h-10 animate-tt-rise items-center gap-2 rounded-full bg-white/15 px-4 text-sm font-medium ring-1 ring-white/25 backdrop-blur-md transition-[background-color,color,scale] duration-200 [animation-delay:180ms] hover:bg-white hover:text-[#111] active:scale-95"
        >
          <Phone size={16} aria-hidden />
          {m.call}
        </a>
      </div>
    </header>
  );
}
