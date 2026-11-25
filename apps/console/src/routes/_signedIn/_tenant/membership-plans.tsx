import { Button } from "@heroui/react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { BadgeCheck, Dumbbell, Plus, PowerOff } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "../../../components/EmptyState";
import { FormModal } from "../../../components/FormModal";
import { HUE_COLOUR, TONE_COLOUR } from "../../../components/look";
import { SkeletonCards } from "../../../components/SkeletonRows";
import { SummaryTiles } from "../../../components/SummaryTiles";
import { canOpen } from "../../../config/routePermissions";
import { AddPlanForm } from "../../../features/membership-plans/AddPlanForm";
import {
  useMembershipPlans,
  usePlanVenues,
} from "../../../features/membership-plans/useMembershipPlans";
import { PLAN_CARD_MIN, VenuePlans } from "../../../features/membership-plans/VenuePlans";
import m from "../../../i18n/en/membershipPlans";
import { PageLayout } from "../../../layout/PageLayout";
import { can } from "../../../lib/tenant/activeTenant";

export const Route = createFileRoute("/_signedIn/_tenant/membership-plans")({
  beforeLoad: ({ context }) => {
    if (!canOpen(context.tenant, "/membership-plans")) throw redirect({ to: "/" });
  },
  component: MembershipPlansPage,
});

type Shown = "onSale" | "turnedOff";

function MembershipPlansPage() {
  const { tenant } = Route.useRouteContext();
  const canAdd = can(tenant, "membership-plans:create");
  const { data: plans } = useMembershipPlans();
  const { data: venues } = usePlanVenues();
  const [shown, setShown] = useState<Shown>();
  const [isAdding, setAdding] = useState(false);
  const [addAt, setAddAt] = useState<number>();
  const openAddForm = (venueId: number) => {
    setAddAt(venueId);
    setAdding(true);
  };
  const firstVenueId = venues?.[0]?.id;

  const all = plans ?? [];
  const matches = (plan: { active: boolean }) => !shown || plan.active === (shown === "onSale");
  const countOf = (which?: Shown) =>
    plans && all.filter((plan) => !which || plan.active === (which === "onSale")).length;
  const atVenue = (venueId: number) =>
    all.filter((plan) => plan.venueId === venueId && matches(plan));
  const shownVenues = shown ? venues?.filter((venue) => atVenue(venue.id).length > 0) : venues;

  return (
    <PageLayout
      title={m.title}
      actions={
        canAdd &&
        firstVenueId !== undefined && (
          <Button onPress={() => openAddForm(firstVenueId)}>
            <Plus aria-hidden size={16} />
            {m.addTitle}
          </Button>
        )
      }
    >
      <SummaryTiles
        label={m.byState}
        show={shown}
        onShow={setShown}
        tiles={[
          {
            show: undefined,
            label: m.allPlans,
            icon: BadgeCheck,
            colour: HUE_COLOUR.membership,
            count: countOf(),
          },
          {
            show: "onSale",
            label: m.onSale,
            icon: BadgeCheck,
            colour: TONE_COLOUR.good,
            count: countOf("onSale"),
          },
          {
            show: "turnedOff",
            label: m.turnedOff,
            icon: PowerOff,
            colour: TONE_COLOUR.off,
            count: countOf("turnedOff"),
          },
        ]}
      />
      {!plans || !venues ? (
        <SkeletonCards label={m.loading} min={PLAN_CARD_MIN} cards={3} />
      ) : venues.length === 0 ? (
        <EmptyState hue="membership" icon={Dumbbell}>
          {m.noGyms}
        </EmptyState>
      ) : shownVenues?.length === 0 ? (
        <p className="animate-tt-rise text-muted">{m.noneShown}</p>
      ) : (
        shownVenues?.map((venue) => (
          <VenuePlans
            key={venue.id}
            venue={venue}
            plans={atVenue(venue.id)}
            canTurnOff={can(tenant, "membership-plans:delete")}
            onAdd={canAdd && !shown ? () => openAddForm(venue.id) : undefined}
          />
        ))
      )}
      {canAdd && venues && (
        <FormModal
          isOpen={isAdding}
          onOpenChange={setAdding}
          hue="membership"
          icon={BadgeCheck}
          title={m.addTitle}
        >
          {addAt !== undefined && (
            <AddPlanForm
              key={addAt}
              venues={venues}
              venueId={addAt}
              onAdded={() => setAdding(false)}
            />
          )}
        </FormModal>
      )}
    </PageLayout>
  );
}
