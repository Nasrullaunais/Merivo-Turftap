import { Skeleton } from "@heroui/react";
import { createFileRoute, Navigate, redirect, useRouter } from "@tanstack/react-router";
import { Id, LocalDate } from "@turftap/contract";

import { BackLink } from "../../components/BackLink";
import { NotFoundPanel } from "../../components/NotFoundPanel";
import { BuyStep } from "../../features/plans/BuyStep";
import { usePlan } from "../../features/plans/usePlans";
import { useVenue } from "../../features/venues/useVenue";
import m from "../../i18n/en/memberships";
import { isSignedIn } from "../../lib/auth/session";
import { useMyCustomer } from "../../lib/customer/useMyCustomer";

type Search = { startsOn?: string };

/** MEM-02, MEM-04: buying or renewing a membership. Only for signed-in customers (POR-03). */
export const Route = createFileRoute("/plans/$planId")({
  params: {
    parse: ({ planId }) => ({ planId: Id.parse(Number(planId)) }),
    stringify: ({ planId }) => ({ planId: String(planId) }),
  },
  validateSearch: (search): Search => {
    const startsOn = LocalDate.safeParse(search.startsOn).data;
    return startsOn ? { startsOn } : {};
  },
  beforeLoad: ({ location }) => {
    if (!isSignedIn()) throw redirect({ to: "/sign-in", search: { back: location.href } });
  },
  component: PlanPage,
});

function PlanPage() {
  const { planId } = Route.useParams();
  const { startsOn } = Route.useSearch();
  const router = useRouter();
  const navigate = Route.useNavigate();
  const mine = useMyCustomer({ enabled: true });
  const plan = usePlan(planId);
  const venue = useVenue(plan.data?.venueId);

  if (mine.data === null) {
    return <Navigate to="/sign-in" search={{ back: router.state.location.href }} replace />;
  }
  if (plan.isError || venue.isError) return <NotFoundPanel {...m.planNotFound} />;
  return (
    <div className="mx-auto grid w-full max-w-lg grid-cols-[minmax(0,1fr)] gap-5 lg:max-w-4xl">
      <div>
        {plan.data ? (
          <BackLink
            to="/venues/$venueId"
            params={{ venueId: plan.data.venueId }}
            label={venue.data?.name}
          />
        ) : (
          <BackLink to="/" />
        )}
      </div>
      {plan.data && venue.data ? (
        <BuyStep
          plan={plan.data}
          venue={venue.data}
          customerName={mine.data?.name}
          asked={startsOn}
          onPickDay={(day) => void navigate({ search: { startsOn: day }, replace: true })}
          onBought={(membershipId) =>
            void navigate({
              to: "/memberships/$membershipId",
              params: { membershipId },
              replace: true,
            })
          }
        />
      ) : (
        <div role="status" aria-label={m.plans.loading} className="grid gap-5">
          <Skeleton className="h-8 w-60 rounded-md" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-64 rounded-[1.25rem]" />
        </div>
      )}
    </div>
  );
}
