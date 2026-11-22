import { createFileRoute, redirect } from "@tanstack/react-router";
import { Id } from "@turftap/contract";

import { canOpen } from "../../../../config/routePermissions";
import { ClosedDateList } from "../../../../features/closed-dates/ClosedDateList";
import { CloseDateForm } from "../../../../features/closed-dates/CloseDateForm";
import { AddResourceForm } from "../../../../features/resources/AddResourceForm";
import { ResourceList } from "../../../../features/resources/ResourceList";
import { VenueHeading } from "../../../../features/venues/VenueHeading";
import { can } from "../../../../lib/tenant/activeTenant";

export const Route = createFileRoute("/_signedIn/_tenant/venues/$venueId")({
  params: {
    parse: ({ venueId }) => ({ venueId: Id.parse(Number(venueId)) }),
    stringify: ({ venueId }) => ({ venueId: String(venueId) }),
  },
  beforeLoad: ({ context }) => {
    if (!canOpen(context.tenant, "/venues/$venueId")) throw redirect({ to: "/" });
  },
  component: VenuePage,
});

function VenuePage() {
  const { tenant } = Route.useRouteContext();
  const { venueId } = Route.useParams();

  return (
    <main className="mx-auto grid max-w-2xl gap-6 p-6">
      <VenueHeading venueId={venueId} />
      <ResourceList venueId={venueId} canTurnOff={can(tenant, "resources:delete")} />
      {can(tenant, "resources:create") && <AddResourceForm venueId={venueId} />}
      <ClosedDateList venueId={venueId} canReopen={can(tenant, "closed-dates:delete")} />
      {can(tenant, "closed-dates:create") && <CloseDateForm venueId={venueId} />}
    </main>
  );
}
