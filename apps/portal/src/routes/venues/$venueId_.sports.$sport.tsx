import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Id } from "@turftap/contract";

import { BackLink } from "../../components/BackLink";
import { CardSkeletons } from "../../components/CardSkeletons";
import { NotFoundPanel } from "../../components/NotFoundPanel";
import { sportOfSlug } from "../../components/sportLook";
import { useResources } from "../../features/resources/useResources";
import { ResourceCards } from "../../features/sports/ResourceCards";
import { SportHero } from "../../features/sports/SportHero";
import { useVenue } from "../../features/venues/useVenue";
import m from "../../i18n/en/sports";

export const Route = createFileRoute("/venues/$venueId_/sports/$sport")({
  params: {
    parse: ({ venueId, sport }) => ({ venueId: Id.parse(Number(venueId)), sport }),
    stringify: ({ venueId, sport }) => ({ venueId: String(venueId), sport }),
  },
  component: SportPage,
});

/** POR-02: one sport at a venue. Its courts or tables are told apart only here. */
function SportPage() {
  const { venueId, sport } = Route.useParams();
  const type = sportOfSlug(sport);
  const venue = useVenue(venueId);
  const { data: rentable } = useResources(venueId);
  const own = rentable?.filter((resource) => resource.type === type);

  if (!type || venue.isError || own?.length === 0) return <NotFoundPanel {...m.notFound} />;
  const [only, ...others] = own ?? [];
  if (only && others.length === 0) {
    return <Navigate to="/resources/$resourceId" params={{ resourceId: only.id }} replace />;
  }
  return (
    <div className="grid gap-6">
      <BackLink to="/venues/$venueId" params={{ venueId }} label={venue.data?.name} />
      {venue.data && own ? (
        <>
          <SportHero venue={venue.data} type={type} resources={own} />
          <section aria-labelledby="pick-title" className="grid gap-4">
            <h2
              id="pick-title"
              className="animate-tt-rise text-xl font-semibold tracking-tight [animation-delay:160ms]"
            >
              {m.pick[type]}
            </h2>
            <ResourceCards venue={venue.data} resources={own} />
          </section>
        </>
      ) : (
        <CardSkeletons label={m.loading} />
      )}
    </div>
  );
}
