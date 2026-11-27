import { createFileRoute } from "@tanstack/react-router";

import { offerOfSlug, offerSlug } from "../components/sportLook";
import { VenueList } from "../features/venues/VenueList";
import m from "../i18n/en/venues";

type Search = { offer?: string };

export const Route = createFileRoute("/")({
  validateSearch: (search): Search => {
    const offer = offerOfSlug(search.offer);
    return offer ? { offer: offerSlug(offer) } : {};
  },
  component: HomePage,
});

function HomePage() {
  const { offer } = Route.useSearch();
  return (
    <div className="grid gap-4">
      <h1 className="animate-tt-rise text-3xl font-semibold tracking-tight [animation-delay:60ms]">
        {m.title}
      </h1>
      <VenueList offer={offerOfSlug(offer)} />
    </div>
  );
}
