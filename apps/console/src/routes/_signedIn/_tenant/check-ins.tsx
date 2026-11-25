import { Skeleton } from "@heroui/react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import type { CheckIn } from "@turftap/contract/client";
import { MapPin } from "lucide-react";
import { useCallback, useState } from "react";

import { EmptyState } from "../../../components/EmptyState";
import { SkeletonRows } from "../../../components/SkeletonRows";
import { canOpen } from "../../../config/routePermissions";
import { CheckInDesk, type Picked } from "../../../features/check-ins/CheckInDesk";
import { TodayCheckIns } from "../../../features/check-ins/TodayCheckIns";
import { useDeskVenues, useTodaysCheckIns } from "../../../features/check-ins/useCheckIns";
import m from "../../../i18n/en/checkIns";
import venues from "../../../i18n/en/venues";
import { PageLayout, TwoColumns } from "../../../layout/PageLayout";
import { can } from "../../../lib/tenant/activeTenant";
import { useVenueToday } from "../../../lib/time/useVenueToday";

export const Route = createFileRoute("/_signedIn/_tenant/check-ins")({
  beforeLoad: ({ context }) => {
    if (!canOpen(context.tenant, "/check-ins")) throw redirect({ to: "/" });
  },
  component: CheckInsPage,
});

function CheckInsPage() {
  const { data: deskVenues } = useDeskVenues();
  const [venueId, setVenueId] = useState<number>();
  const venue = deskVenues?.find((each) => each.id === venueId) ?? deskVenues?.[0];

  return (
    <PageLayout title={m.title}>
      {!deskVenues ? (
        <TwoColumns
          main={<Skeleton className="h-[88px] rounded-xl" />}
          side={<SkeletonRows label={m.loadingToday} rows={4} />}
        />
      ) : !venue ? (
        <EmptyState hue="place" icon={MapPin}>
          {venues.none}
        </EmptyState>
      ) : (
        <Desk venues={deskVenues} venue={venue} onVenue={setVenueId} />
      )}
    </PageLayout>
  );
}

type DeskProps = Pick<React.ComponentProps<typeof CheckInDesk>, "venues" | "venue" | "onVenue">;

function Desk({ venues: all, venue, onVenue }: DeskProps) {
  const { tenant } = Route.useRouteContext();
  const today = useVenueToday(venue.timeZone)!;
  const { data: todaysCheckIns } = useTodaysCheckIns(venue.id, today);
  const [typed, setTyped] = useState("");
  const [picked, setPicked] = useState<Picked>();

  const onType = useCallback((value: string) => {
    setTyped(value);
    setPicked(undefined);
  }, []);
  const onOpen = useCallback((checkIn: CheckIn) => {
    setTyped(checkIn.customerPhone);
    setPicked({ id: checkIn.customerId, name: checkIn.customerName, phone: checkIn.customerPhone });
  }, []);

  return (
    <TwoColumns
      main={
        <CheckInDesk
          venues={all}
          venue={venue}
          onVenue={onVenue}
          today={today}
          todaysCheckIns={todaysCheckIns}
          typed={typed}
          onType={onType}
          picked={picked}
          onPick={setPicked}
          can={{
            checkIn: can(tenant, "check-ins:create"),
            takeCash: can(tenant, "payments:create"),
            sell: can(tenant, "memberships:create"),
          }}
        />
      }
      side={
        <div className="animate-tt-rise [animation-delay:90ms]">
          <TodayCheckIns
            checkIns={todaysCheckIns}
            timeZone={venue.timeZone}
            canUndo={can(tenant, "check-ins:delete")}
            onOpen={onOpen}
          />
        </div>
      }
    />
  );
}
