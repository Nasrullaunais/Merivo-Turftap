import { createFileRoute, redirect } from "@tanstack/react-router";
import { Id } from "@turftap/contract";
import { LayoutGrid } from "lucide-react";
import { useState } from "react";

import { AddSlot } from "../../../../components/AddSlot";
import { BackLink } from "../../../../components/BackLink";
import { FormModal } from "../../../../components/FormModal";
import { canOpen } from "../../../../config/routePermissions";
import { ClosedDateList } from "../../../../features/closed-dates/ClosedDateList";
import { CloseDateForm } from "../../../../features/closed-dates/CloseDateForm";
import { PhotoGallery } from "../../../../features/photos/PhotoGallery";
import { AddResourceForm } from "../../../../features/resources/AddResourceForm";
import { ResourceList } from "../../../../features/resources/ResourceList";
import { CheckInSettings } from "../../../../features/venues/CheckInSettings";
import { OpeningHoursCard } from "../../../../features/venues/OpeningHoursCard";
import { PaymentSettings } from "../../../../features/venues/PaymentSettings";
import { VenueHeader } from "../../../../features/venues/VenueHeading";
import closedDates from "../../../../i18n/en/closedDates";
import resources from "../../../../i18n/en/resources";
import m from "../../../../i18n/en/venues";
import { PageLayout, TwoColumns } from "../../../../layout/PageLayout";
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
  const canAddResource = can(tenant, "resources:create");
  const [isAdding, setAdding] = useState(false);

  return (
    <PageLayout title={m.title} back={<BackLink to="/venues" label={m.backToVenues} />}>
      <VenueHeader venueId={venueId} />
      <TwoColumns
        main={
          <>
            <ResourceList
              venueId={venueId}
              canTurnOff={can(tenant, "resources:delete")}
              onAdd={canAddResource ? () => setAdding(true) : undefined}
            />
            <PhotoGallery
              owner={{ venueId }}
              canAdd={can(tenant, "photos:create")}
              canMove={can(tenant, "photos:update")}
              canDelete={can(tenant, "photos:delete")}
            />
            <PaymentSettings venueId={venueId} canChange={can(tenant, "venues:update")} />
          </>
        }
        side={
          <>
            <OpeningHoursCard venueId={venueId} />
            <CheckInSettings venueId={venueId} canChange={can(tenant, "venues:update")} />
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
          </>
        }
      />
      {canAddResource && (
        <FormModal
          isOpen={isAdding}
          onOpenChange={setAdding}
          hue="place"
          icon={LayoutGrid}
          title={resources.addTitle}
        >
          <AddResourceForm venueId={venueId} onAdded={() => setAdding(false)} />
        </FormModal>
      )}
    </PageLayout>
  );
}
