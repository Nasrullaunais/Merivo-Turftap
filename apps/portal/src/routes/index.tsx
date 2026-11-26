import { createFileRoute } from "@tanstack/react-router";

import { VenueList } from "../features/venues/VenueList";
import m from "../i18n/en/venues";

export const Route = createFileRoute("/")({ component: HomePage });

function HomePage() {
  return (
    <div className="grid gap-5">
      <h1 className="animate-tt-rise text-2xl font-semibold tracking-tight [animation-delay:60ms]">
        {m.title}
      </h1>
      <VenueList />
    </div>
  );
}
