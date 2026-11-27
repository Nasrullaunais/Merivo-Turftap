import { createFileRoute } from "@tanstack/react-router";
import { Id } from "@turftap/contract";

import { BackLink } from "../../components/BackLink";
import { NotFoundPanel } from "../../components/NotFoundPanel";
import { PlanList } from "../../features/plans/PlanList";
import { ResourceList } from "../../features/resources/ResourceList";
import { useResources } from "../../features/resources/useResources";
import { useVenue } from "../../features/venues/useVenue";
import { VenueHeader } from "../../features/venues/VenueHeader";
import resources from "../../i18n/en/resources";
import venues from "../../i18n/en/venues";

export const Route = createFileRoute("/venues/$venueId")({
  params: {
    parse: ({ venueId }) => ({ venueId: Id.parse(Number(venueId)) }),
    stringify: ({ venueId }) => ({ venueId: String(venueId) }),
  },
  component: VenuePage,
});

function VenuePage() {
  const { venueId } = Route.useParams();
  const venue = useVenue(venueId);
  const rentable = useResources(venueId);
  // A gym with nothing to rent shows only its memberships, not an empty list of resources.
  const gymOnly = venue.data?.hasGym === true && rentable.data?.length === 0;

  if (venue.isError) return <NotFoundPanel {...resources.notFound} />;
  return (
    <div className="grid gap-5">
      <BackLink to="/" label={venues.allVenues} />
      <VenueHeader venueId={venueId} />
      {!gymOnly && (
        <section aria-labelledby="resources-title" className="grid gap-4 pt-2">
          <h2
            id="resources-title"
            className="animate-tt-rise text-lg font-semibold tracking-tight [animation-delay:160ms]"
          >
            {resources.title}
          </h2>
          <ResourceList venueId={venueId} />
        </section>
      )}
      {venue.data && <PlanList venue={venue.data} />}
    </div>
  );
}
