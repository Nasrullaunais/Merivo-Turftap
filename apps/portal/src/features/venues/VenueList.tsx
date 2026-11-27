import { Link } from "@tanstack/react-router";
import type { Resource, Venue } from "@turftap/contract/client";
import { ArrowUpRight, MapPin, Store } from "lucide-react";

import { Backdrop } from "../../components/Backdrop";
import { CardSkeletons } from "../../components/CardSkeletons";
import { arrivalDelay } from "../../components/look";
import { OfferLink } from "../../components/OfferLink";
import { OpenPill } from "../../components/OpenPill";
import { OFFER_ICONS, bySport, offersOf, type Offer } from "../../components/sportLook";
import sports from "../../i18n/en/sports";
import m from "../../i18n/en/venues";
import { OfferFilter } from "./OfferFilter";
import { useAllResources } from "./useAllResources";
import { useVenues } from "./useVenues";

const CARDS_START_MS = 200;

/** POR-02: one picture card per venue, with a chip for each sport and the gym it offers. */
export function VenueList({ offer }: { offer?: Offer }) {
  const { data: venues, isPending } = useVenues();
  const all = useAllResources();

  if (isPending || (venues?.length && all.isPending)) return <CardSkeletons label={m.loading} />;
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

  const resources = all.data ?? [];
  const cards = venues.map((venue) => {
    const own = resources.filter((resource) => resource.venueId === venue.id);
    return { venue, resources: own, offers: offersOf(own, venue.hasGym) };
  });
  const everyOffer = [...new Set(cards.flatMap((card) => card.offers))];
  const shown = offer ? cards.filter((card) => card.offers.includes(offer)) : cards;

  return (
    <div className="grid gap-5">
      {everyOffer.length > 1 && <OfferFilter offers={everyOffer} chosen={offer} />}
      <ul key={offer ?? "all"} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((card, index) => (
          <li
            key={card.venue.id}
            className="animate-tt-card-in"
            style={arrivalDelay(index, CARDS_START_MS)}
          >
            <VenueCard {...card} chosen={offer} />
          </li>
        ))}
      </ul>
    </div>
  );
}

type CardProps = { venue: Venue; resources: Resource[]; offers: Offer[]; chosen?: Offer };

function VenueCard({ venue, resources, offers, chosen }: CardProps) {
  const sportsHere = bySport(resources);
  const gymOnly = sportsHere.length === 0;
  return (
    <article className="group relative isolate flex h-full min-h-[20rem] flex-col justify-end overflow-hidden rounded-3xl text-white shadow-[var(--tt-shadow-card)] transition-[translate,box-shadow,scale] duration-200 ease-[var(--tt-ease)] hover:-translate-y-1 hover:shadow-[var(--tt-shadow-raised)] has-[a:active]:scale-[0.99]">
      <Backdrop photoOf={{ venueId: venue.id }} scenes={offers} alt={m.coverAlt(venue.name)} />
      <div className="absolute top-4 left-4">
        <OpenPill venue={venue} />
      </div>
      <span
        aria-hidden
        className="absolute top-4 right-4 grid size-10 place-items-center rounded-full bg-white/15 ring-1 ring-white/25 backdrop-blur-md transition-[background-color,color,rotate] duration-200 group-hover:rotate-45 group-hover:bg-white group-hover:text-[#111]"
      >
        <ArrowUpRight size={20} />
      </span>
      <div className="grid gap-3 p-5">
        <div className="grid gap-1">
          <h2 className="text-2xl font-semibold tracking-tight text-balance">
            <Link
              to="/venues/$venueId"
              params={{ venueId: venue.id }}
              className="outline-none after:absolute after:inset-0 after:rounded-3xl after:content-[''] focus-visible:after:ring-4 focus-visible:after:ring-[var(--accent)] focus-visible:after:ring-inset"
            >
              {venue.name}
            </Link>
          </h2>
          <p className="flex items-start gap-1.5 text-sm text-white/80">
            <MapPin size={15} aria-hidden className="mt-0.5 shrink-0" />
            {venue.address}
          </p>
        </div>
        {offers.length > 0 && (
          <ul className="relative flex flex-wrap gap-2">
            {offers.map((offer) => {
              const Icon = OFFER_ICONS[offer];
              const ids =
                sportsHere.find((sport) => sport.type === offer)?.resources.map((one) => one.id) ??
                [];
              return (
                <li key={offer}>
                  <OfferLink
                    venueId={venue.id}
                    offer={offer}
                    resourceIds={ids}
                    gymOnly={gymOnly}
                    data-on={offer === chosen}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/15 px-3 text-sm font-medium ring-1 ring-white/25 backdrop-blur-md transition-[background-color,color,scale] duration-200 hover:bg-white hover:text-[#111] active:scale-95 data-[on=true]:bg-white data-[on=true]:text-[#111]"
                  >
                    <Icon size={16} aria-hidden />
                    {sports.names[offer]}
                  </OfferLink>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </article>
  );
}
