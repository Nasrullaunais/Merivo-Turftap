import { createFileRoute, redirect } from "@tanstack/react-router";
import { Id } from "@turftap/contract";
import { Tag } from "lucide-react";

import { AddSlot } from "../../../../components/AddSlot";
import { Section } from "../../../../components/Section";
import { canOpen } from "../../../../config/routePermissions";
import { BlockedTimeList } from "../../../../features/blocked-times/BlockedTimeList";
import { BlockResourceForm } from "../../../../features/blocked-times/BlockResourceForm";
import { PhotoGallery } from "../../../../features/photos/PhotoGallery";
import { AddPriceRuleForm } from "../../../../features/price-rules/AddPriceRuleForm";
import { PriceRuleList } from "../../../../features/price-rules/PriceRuleList";
import { DefaultPrice } from "../../../../features/resources/DefaultPrice";
import {
  ResourceBackLink,
  ResourceHeader,
  ResourceVenueName,
} from "../../../../features/resources/ResourceHeading";
import blockedTimes from "../../../../i18n/en/blockedTimes";
import prices from "../../../../i18n/en/prices";
import { PageLayout, TwoColumns } from "../../../../layout/PageLayout";
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
      title={<ResourceVenueName resourceId={resourceId} />}
      back={<ResourceBackLink resourceId={resourceId} />}
    >
      <ResourceHeader resourceId={resourceId} />
      <TwoColumns
        main={
          <>
            <Section hue="money" icon={Tag} title={prices.title}>
              <DefaultPrice resourceId={resourceId} canChange={can(tenant, "resources:update")} />
              <PriceRuleList
                resourceId={resourceId}
                canDelete={can(tenant, "price-rules:delete")}
              />
              {can(tenant, "price-rules:create") && (
                <AddSlot label={prices.addRuleTitle}>
                  {(fold) => <AddPriceRuleForm resourceId={resourceId} onAdded={fold} />}
                </AddSlot>
              )}
            </Section>
            <PhotoGallery
              owner={{ resourceId }}
              canAdd={can(tenant, "photos:create")}
              canMove={can(tenant, "photos:update")}
              canDelete={can(tenant, "photos:delete")}
            />
          </>
        }
        side={
          <BlockedTimeList
            resourceId={resourceId}
            canUnblock={can(tenant, "blocked-times:delete")}
            addSlot={
              can(tenant, "blocked-times:create") && (
                <AddSlot label={blockedTimes.addTitle}>
                  {(fold) => <BlockResourceForm resourceId={resourceId} onBlocked={fold} />}
                </AddSlot>
              )
            }
          />
        }
      />
    </PageLayout>
  );
}
