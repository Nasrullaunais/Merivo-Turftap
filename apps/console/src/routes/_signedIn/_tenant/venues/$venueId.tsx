import { createFileRoute, redirect } from "@tanstack/react-router";
import { Id } from "@turftap/contract";

import { AddSlot } from "../../../../components/AddSlot";
import { BackLink } from "../../../../components/BackLink";
import { canOpen } from "../../../../config/routePermissions";
import { ClosedDateList } from "../../../../features/closed-dates/ClosedDateList";
import { CloseDateForm } from "../../../../features/closed-dates/CloseDateForm";
import { PhotoGallery } from "../../../../features/photos/PhotoGallery";
import { AddResourceForm } from "../../../../features/resources/AddResourceForm";
import { ResourceList } from "../../../../features/resources/ResourceList";
import { PaymentSettings } from "../../../../features/venues/PaymentSettings";
import { VenueHeader } from "../../../../features/venues/VenueHeading";
import closedDates from "../../../../i18n/en/closedDates";
import resources from "../../../../i18n/en/resources";
import m from "../../../../i18n/en/venues";
import { PageLayout } from "../../../../layout/PageLayout";
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
    <PageLayout
      title={m.title}
      back={<BackLink to="/venues" label={m.backToVenues} />}
      width="form"
    >
      <VenueHeader venueId={venueId} />
      <ResourceList
        venueId={venueId}
        canTurnOff={can(tenant, "resources:delete")}
        addSlot={
          can(tenant, "resources:create") && (
            <AddSlot label={resources.addTitle}>
              {(fold) => <AddResourceForm venueId={venueId} onAdded={fold} />}
            </AddSlot>
          )
        }
      />
      <PhotoGallery
        owner={{ venueId }}
        canAdd={can(tenant, "photos:create")}
        canMove={can(tenant, "photos:update")}
        canDelete={can(tenant, "photos:delete")}
      />
      <ClosedDateList
        venueId={venueId}
        canReopen={can(tenant, "closed-dates:delete")}
        addSlot={
          can(tenant, "closed-dates:create") && (
            <AddSlot label={closedDates.addTitle}>
              {(fold) => <CloseDateForm venueId={venueId} onClosed={fold} />}
            </AddSlot>
          )
        }
      />
      <PaymentSettings venueId={venueId} canChange={can(tenant, "venues:update")} />
    </PageLayout>
  );
}
