import { createFileRoute, Navigate, redirect, useRouter } from "@tanstack/react-router";
import { Id, Timestamp } from "@turftap/contract";
import { onVenueClock } from "@turftap/ui";

import { BackLink } from "../components/BackLink";
import { NotFoundPanel } from "../components/NotFoundPanel";
import { ConfirmSkeleton } from "../features/book/ConfirmSkeleton";
import { ConfirmStep } from "../features/book/ConfirmStep";
import { useResource } from "../features/resources/useResource";
import { useVenue } from "../features/venues/useVenue";
import m from "../i18n/en/booking";
import resources from "../i18n/en/resources";
import { isSignedIn } from "../lib/auth/session";
import { useMyCustomer } from "../lib/customer/useMyCustomer";

type BookSearch = { resourceId?: number; startsAt?: string; count?: number };

/** BKG-02: the chosen time, checked once more, then booked. Only for signed-in customers (POR-03). */
export const Route = createFileRoute("/book")({
  validateSearch: (search): BookSearch => ({
    resourceId: Id.safeParse(Number(search.resourceId)).data,
    startsAt: Timestamp.safeParse(search.startsAt).data?.toISOString(),
    count: Id.safeParse(Number(search.count)).data,
  }),
  beforeLoad: ({ location }) => {
    if (!isSignedIn()) throw redirect({ to: "/sign-in", search: { back: location.href } });
  },
  component: BookPage,
});

function BookPage() {
  const { resourceId, startsAt, count } = Route.useSearch();
  if (!resourceId || !startsAt || !count) return <Navigate to="/" replace />;
  return <Confirm resourceId={resourceId} startsAt={startsAt} count={count} />;
}

function Confirm({ resourceId, startsAt, count }: Required<BookSearch>) {
  const router = useRouter();
  const navigate = Route.useNavigate();
  const mine = useMyCustomer({ enabled: true });
  const resource = useResource(resourceId);
  const venue = useVenue(resource.data?.venueId);

  if (mine.data === null) {
    return <Navigate to="/sign-in" search={{ back: router.state.location.href }} replace />;
  }
  if (resource.isError || venue.isError) return <NotFoundPanel {...resources.notFound} />;
  const date = venue.data && onVenueClock(startsAt, venue.data.timeZone).date;
  return (
    <div className="mx-auto grid w-full max-w-lg grid-cols-1 gap-5 lg:max-w-4xl">
      <div>
        <BackLink
          to="/resources/$resourceId"
          params={{ resourceId }}
          search={{ date }}
          label={venue.data && m.confirm.changeTime}
        />
      </div>
      {resource.data && venue.data ? (
        <ConfirmStep
          resource={resource.data}
          venue={venue.data}
          startsAt={startsAt}
          count={count}
          customerName={mine.data?.name}
          onBooked={(bookingId) =>
            void navigate({ to: "/bookings/$bookingId", params: { bookingId }, replace: true })
          }
          onSlotGone={() =>
            void navigate({
              to: "/resources/$resourceId",
              params: { resourceId },
              search: { date },
              state: { justTaken: true },
              replace: true,
            })
          }
        />
      ) : (
        <ConfirmSkeleton />
      )}
    </div>
  );
}
