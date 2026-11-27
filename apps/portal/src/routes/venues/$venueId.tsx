import { createFileRoute } from "@tanstack/react-router";
import { Id } from "@turftap/contract";

import { BackLink } from "../../components/BackLink";
import { CardSkeletons } from "../../components/CardSkeletons";
import { NotFoundPanel } from "../../components/NotFoundPanel";
import { offersOf } from "../../components/sportLook";
import { GymCard } from "../../features/plans/GymCard";
import { GymPlans } from "../../features/plans/GymPlans";
import { useResources } from "../../features/resources/useResources";
import { SportCards } from "../../features/sports/SportCards";
import { useVenue } from "../../features/venues/useVenue";
import { VenueHero } from "../../features/venues/VenueHero";
import resources from "../../i18n/en/resources";
import sports from "../../i18n/en/sports";
import venues from "../../i18n/en/venues";

export const Route = createFileRoute("/venues/$venueId")({
  params: {
    parse: ({ venueId }) => ({ venueId: Id.parse(Number(venueId)) }),
    stringify: ({ venueId }) => ({ venueId: String(venueId) }),
  },
  component: VenuePage,
});

/** POR-02: a venue's sports and its gym, each on its own card, so each leads to its own page. */
function VenuePage() {
  const { venueId } = Route.useParams();
  const { data: venue, isError } = useVenue(venueId);
  const { data: rentable } = useResources(venueId);

  if (isError) return <NotFoundPanel {...resources.notFound} />;
  const offers = venue && rentable ? offersOf(rentable, venue.hasGym) : undefined;
  return (
    <div className="grid gap-6">
      <BackLink to="/" label={venues.allVenues} />
      <VenueHero venue={venue} offers={offers} />
      {!venue || !rentable ? (
        <CardSkeletons label={sports.loading} />
      ) : rentable.length === 0 && !venue.hasGym ? (
        <p className="tt-panel animate-tt-rise px-6 py-12 text-center text-muted">
          {resources.empty}
        </p>
      ) : rentable.length === 0 ? (
        <GymPlans venue={venue} />
      ) : (
        <>
          <section aria-labelledby="sports-title" className="grid gap-4">
            <h2
              id="sports-title"
              className="animate-tt-rise text-xl font-semibold tracking-tight [animation-delay:160ms]"
            >
              {sports.bookTitle}
            </h2>
            <SportCards venue={venue} resources={rentable} />
          </section>
          <GymCard venue={venue} />
        </>
      )}
    </div>
  );
}
