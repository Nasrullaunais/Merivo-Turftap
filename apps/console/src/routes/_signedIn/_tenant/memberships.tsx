import { Button, Label, SearchField } from "@heroui/react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import type { Membership } from "@turftap/contract/client";
import { BadgeCheck, CalendarX, Hourglass, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState } from "../../../components/EmptyState";
import { FormModal } from "../../../components/FormModal";
import { HUE_COLOUR, TONE_COLOUR } from "../../../components/look";
import { SkeletonCards } from "../../../components/SkeletonRows";
import { SummaryTiles } from "../../../components/SummaryTiles";
import { canOpen } from "../../../config/routePermissions";
import { CARD_MIN, MembershipCards } from "../../../features/memberships/MembershipCards";
import { SellMembershipForm } from "../../../features/memberships/SellMembershipForm";
import {
  useMemberships,
  useMembershipVenues,
  usePlansOnSale,
} from "../../../features/memberships/useMemberships";
import m from "../../../i18n/en/memberships";
import { PageLayout } from "../../../layout/PageLayout";
import { can } from "../../../lib/tenant/activeTenant";
import { onVenueClock } from "../../../lib/time/venueClock";

export const Route = createFileRoute("/_signedIn/_tenant/memberships")({
  beforeLoad: ({ context }) => {
    if (!canOpen(context.tenant, "/memberships")) throw redirect({ to: "/" });
  },
  component: MembershipsPage,
});

type Shown = "active" | "waiting" | "finished";

const SHOWN_STATES: Record<Shown, Membership["status"][]> = {
  active: ["ACTIVE"],
  waiting: ["AWAITING_PAYMENT", "AWAITING_CHECK"],
  finished: ["ENDED", "EXPIRED", "CANCELLED"],
};

// Receipts to check first, then waiting ones, then active ones ending soonest; finished last.
const ORDER: Record<Membership["status"], number> = {
  AWAITING_CHECK: 0,
  AWAITING_PAYMENT: 1,
  ACTIVE: 2,
  ENDED: 3,
  EXPIRED: 3,
  CANCELLED: 3,
};
const byWhatNeedsAHand = (a: Membership, b: Membership) =>
  ORDER[a.status] - ORDER[b.status] ||
  (ORDER[a.status] < ORDER.ENDED
    ? a.endsOn.localeCompare(b.endsOn)
    : b.endsOn.localeCompare(a.endsOn));

const matches = (search: string) => (membership: Membership) => {
  const words = search.trim().toLowerCase();
  if (!words) return true;
  const digits = words.replace(/\D/g, "");
  return (
    membership.customerName.toLowerCase().includes(words) ||
    membership.planName.toLowerCase().includes(words) ||
    (digits.length > 0 &&
      membership.customerPhone.replace(/\D/g, "").includes(digits.replace(/^0/, "")))
  );
};

function MembershipsPage() {
  const { tenant } = Route.useRouteContext();
  const canSell = can(tenant, "memberships:create");
  const { data } = useMemberships();
  const { data: venues } = useMembershipVenues();
  const places = usePlansOnSale();
  const [shown, setShown] = useState<Shown>();
  const [search, setSearch] = useState("");
  const [isSelling, setSelling] = useState(false);
  const [now] = useState(() => new Date());

  const venueMap = useMemo(() => new Map(venues?.map((venue) => [venue.id, venue])), [venues]);
  const todayAt = (venueId: number) => {
    const venue = venueMap.get(venueId);
    return venue && onVenueClock(now, venue.timeZone).date;
  };

  const all = data?.memberships ?? [];
  const inState = (which?: Shown) => (membership: Membership) =>
    !which || SHOWN_STATES[which].includes(membership.status);
  const countOf = (which?: Shown) => data && all.filter(inState(which)).length;
  const listed = all.filter(inState(shown)).filter(matches(search)).sort(byWhatNeedsAHand);
  const toCheck = all.filter((membership) => membership.status === "AWAITING_CHECK").length;

  const onSold = () => {
    setSelling(false);
    setShown(undefined);
    setSearch("");
  };

  return (
    <PageLayout
      title={m.title}
      actions={
        canSell && (
          <Button isDisabled={!places?.length} onPress={() => setSelling(true)}>
            <Plus aria-hidden size={16} />
            {m.sell}
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
            label: m.all,
            icon: BadgeCheck,
            colour: HUE_COLOUR.membership,
            count: countOf(),
          },
          {
            show: "active",
            label: m.active,
            icon: BadgeCheck,
            colour: TONE_COLOUR.good,
            count: countOf("active"),
          },
          {
            show: "waiting",
            label: m.waiting,
            hint: toCheck > 0 ? m.toCheck(toCheck) : undefined,
            icon: Hourglass,
            colour: TONE_COLOUR.watch,
            count: countOf("waiting"),
          },
          {
            show: "finished",
            label: m.finished,
            icon: CalendarX,
            colour: TONE_COLOUR.off,
            count: countOf("finished"),
          },
        ]}
      />
      {data && all.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 animate-tt-rise">
          <SearchField
            aria-label={m.search}
            value={search}
            onChange={setSearch}
            className="w-full sm:w-80"
          >
            <Label className="sr-only">{m.search}</Label>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder={m.search} />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <span aria-live="polite" className=" text-sm text-muted tabular-nums">
            {m.shownOf(listed.length, all.length)}
          </span>
          {data.total > all.length && (
            <span className="text-sm text-muted tabular-nums">
              {m.newestOnly(all.length, data.total)}
            </span>
          )}
        </div>
      )}
      {!data || !venues ? (
        <SkeletonCards label={m.loading} min={CARD_MIN} cards={6} />
      ) : (
        <MembershipCards
          memberships={listed}
          venues={venueMap}
          todayAt={todayAt}
          isFiltered={shown !== undefined || search.trim() !== ""}
          empty={
            places?.length === 0 ? (
              <EmptyState
                hue="membership"
                icon={BadgeCheck}
                action={
                  <Link to="/membership-plans" className="font-medium text-accent hover:underline">
                    {m.openPlans}
                  </Link>
                }
              >
                {m.noPlans}
              </EmptyState>
            ) : (
              <EmptyState
                hue="membership"
                icon={BadgeCheck}
                action={
                  canSell && (
                    <Button onPress={() => setSelling(true)}>
                      <Plus aria-hidden size={16} />
                      {m.sell}
                    </Button>
                  )
                }
              >
                {m.none}
              </EmptyState>
            )
          }
        />
      )}
      {canSell && places && places.length > 0 && (
        <FormModal
          isOpen={isSelling}
          onOpenChange={setSelling}
          hue="membership"
          icon={BadgeCheck}
          title={m.sell}
          size="lg"
        >
          <SellMembershipForm places={places} onSold={onSold} />
        </FormModal>
      )}
    </PageLayout>
  );
}
