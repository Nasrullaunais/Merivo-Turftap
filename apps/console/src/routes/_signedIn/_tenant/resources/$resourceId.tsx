import { createFileRoute, redirect } from "@tanstack/react-router";
import { Id } from "@turftap/contract";

import { canOpen } from "../../../../config/routePermissions";
import { BlockedTimeList } from "../../../../features/blocked-times/BlockedTimeList";
import { BlockResourceForm } from "../../../../features/blocked-times/BlockResourceForm";
import { AddPriceRuleForm } from "../../../../features/price-rules/AddPriceRuleForm";
import { PriceRuleList } from "../../../../features/price-rules/PriceRuleList";
import { DefaultPrice } from "../../../../features/resources/DefaultPrice";
import {
  ResourceBackLink,
  ResourceDetails,
  ResourceName,
} from "../../../../features/resources/ResourceHeading";
import { PhotoGallery } from "../../../../features/photos/PhotoGallery";
import { PageLayout } from "../../../../layout/PageLayout";
import { can } from "../../../../lib/tenant/activeTenant";

export const Route = createFileRoute("/_signedIn/_tenant/resources/$resourceId")({
  params: {
    parse: ({ resourceId }) => ({ resourceId: Id.parse(Number(resourceId)) }),
    stringify: ({ resourceId }) => ({ resourceId: String(resourceId) }),
  },
  beforeLoad: ({ context }) => {
    if (!canOpen(context.tenant, "/resources/$resourceId")) throw redirect({ to: "/" });
  },
  component: ResourcePage,
});

function ResourcePage() {
  const { tenant } = Route.useRouteContext();
  const { resourceId } = Route.useParams();

  return (
    <PageLayout
      title={<ResourceName resourceId={resourceId} />}
      back={<ResourceBackLink resourceId={resourceId} />}
      width="form"
    >
      <ResourceDetails resourceId={resourceId} />
      <PhotoGallery
        owner={{ resourceId }}
        canAdd={can(tenant, "photos:create")}
        canMove={can(tenant, "photos:update")}
        canDelete={can(tenant, "photos:delete")}
      />
      {can(tenant, "resources:update") && <DefaultPrice resourceId={resourceId} />}
      <PriceRuleList resourceId={resourceId} canDelete={can(tenant, "price-rules:delete")} />
      {can(tenant, "price-rules:create") && <AddPriceRuleForm resourceId={resourceId} />}
      <BlockedTimeList resourceId={resourceId} canUnblock={can(tenant, "blocked-times:delete")} />
      {can(tenant, "blocked-times:create") && <BlockResourceForm resourceId={resourceId} />}
    </PageLayout>
  );
}
