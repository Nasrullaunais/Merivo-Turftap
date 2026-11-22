import { createFileRoute, redirect } from "@tanstack/react-router";

import { canOpen } from "../../../../config/routePermissions";
import { AddVenueForm } from "../../../../features/venues/AddVenueForm";
import { VenueList } from "../../../../features/venues/VenueList";
import m from "../../../../i18n/en/venues";
import { can } from "../../../../lib/tenant/activeTenant";

export const Route = createFileRoute("/_signedIn/_tenant/venues/")({
  beforeLoad: ({ context }) => {
    if (!canOpen(context.tenant, "/venues")) throw redirect({ to: "/" });
  },
  component: VenuesPage,
});

function VenuesPage() {
  const { tenant } = Route.useRouteContext();

  return (
    <main className="mx-auto grid max-w-2xl gap-6 p-6">
      <h1 className="text-2xl font-semibold">{m.title}</h1>
      <VenueList />
      {can(tenant, "venues:create") && <AddVenueForm />}
    </main>
  );
}
