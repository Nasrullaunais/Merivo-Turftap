import { Button } from "@heroui/react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { MapPin, Plus } from "lucide-react";
import { useState } from "react";

import { FormModal } from "../../../../components/FormModal";
import { canOpen } from "../../../../config/routePermissions";
import { CoverPhoto } from "../../../../features/photos/CoverPhoto";
import { ResourceTypeCounts } from "../../../../features/resources/ResourceTypeCounts";
import { AddVenueForm } from "../../../../features/venues/AddVenueForm";
import { VenueCards } from "../../../../features/venues/VenueCards";
import m from "../../../../i18n/en/venues";
import { PageLayout } from "../../../../layout/PageLayout";
import { can } from "../../../../lib/tenant/activeTenant";

export const Route = createFileRoute("/_signedIn/_tenant/venues/")({
  beforeLoad: ({ context }) => {
    if (!canOpen(context.tenant, "/venues")) throw redirect({ to: "/" });
  },
  component: VenuesPage,
});

function VenuesPage() {
  const { tenant } = Route.useRouteContext();
  const canAdd = can(tenant, "venues:create");
  const [isAdding, setAdding] = useState(false);

  return (
    <PageLayout
      title={m.title}
      actions={
        canAdd && (
          <Button onPress={() => setAdding(true)}>
            <Plus aria-hidden size={16} />
            {m.addTitle}
          </Button>
        )
      }
    >
      <VenueCards
        cover={(venueId) => <CoverPhoto owner={{ venueId }} />}
        holds={(venueId) => <ResourceTypeCounts venueId={venueId} />}
      />
      {canAdd && (
        <FormModal
          isOpen={isAdding}
          onOpenChange={setAdding}
          hue="place"
          icon={MapPin}
          title={m.addTitle}
          size="lg"
        >
          <AddVenueForm onAdded={() => setAdding(false)} />
        </FormModal>
      )}
    </PageLayout>
  );
}
