import { createFileRoute } from "@tanstack/react-router";

import { VenueList } from "../features/venues/VenueList";
import m from "../i18n/en/venues";

export const Route = createFileRoute("/")({ component: HomePage });

function HomePage() {
  return (
    <main className="mx-auto grid max-w-xl gap-4 p-4">
      <h1 className="text-2xl font-semibold">{m.title}</h1>
      <VenueList />
    </main>
  );
}
