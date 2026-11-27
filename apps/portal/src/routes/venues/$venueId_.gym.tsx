import { createFileRoute } from "@tanstack/react-router";
import { Id } from "@turftap/contract";
import { Dumbbell } from "lucide-react";

import { BackLink } from "../../components/BackLink";
import { CardSkeletons } from "../../components/CardSkeletons";
import { NotFoundPanel } from "../../components/NotFoundPanel";
import { OpenPill } from "../../components/OpenPill";
import { PageHero } from "../../components/PageHero";
import { GymPlans } from "../../features/plans/GymPlans";
import { useVenue } from "../../features/venues/useVenue";
import m from "../../i18n/en/sports";

export const Route = createFileRoute("/venues/$venueId_/gym")({
  params: {
    parse: ({ venueId }) => ({ venueId: Id.parse(Number(venueId)) }),
    stringify: ({ venueId }) => ({ venueId: String(venueId) }),
  },
  component: GymPage,
});

/** MEM-02: a venue's gym on its own page, apart from what is booked by the hour. */
function GymPage() {
  const { venueId } = Route.useParams();
  const { data: venue, isError } = useVenue(venueId);

  if (isError || venue?.hasGym === false) return <NotFoundPanel {...m.notFound} />;
  return (
    <div className="grid gap-6">
      <BackLink to="/venues/$venueId" params={{ venueId }} label={venue?.name} />
      {venue ? (
        <>
          <PageHero
            scenes={["GYM"]}
            alt=""
            badge={<OpenPill venue={venue} />}
            icon={<Dumbbell size={28} aria-hidden />}
            title={m.names.GYM}
          >
            {m.at(venue.name)}
          </PageHero>
          <GymPlans venue={venue} />
        </>
      ) : (
        <CardSkeletons label={m.loading} />
      )}
    </div>
  );
}
