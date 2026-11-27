import { Skeleton } from "@heroui/react";
import { Link } from "@tanstack/react-router";
import type { MembershipPlan, Venue } from "@turftap/contract/client";
import { formatMoney } from "@turftap/ui";
import { BadgeCheck, ChevronRight, Store } from "lucide-react";

import { arrivalDelay } from "../../components/look";
import m from "../../i18n/en/memberships";
import { usePlans } from "./usePlans";

const CARDS_START_MS = 240;
const SKELETON_CARDS = 2;

/** MEM-02: a gym's Membership Plans with their length and price. A tap starts buying one. */
export function PlanList({ venue }: { venue: Venue }) {
  const plans = usePlans(venue.id, venue.hasGym);

  if (!venue.hasGym || plans.data?.length === 0) return null;
  return (
    <section aria-labelledby="plans-title" className="grid gap-4 pt-2">
      <h2
        id="plans-title"
        className="animate-tt-rise text-lg font-semibold tracking-tight [animation-delay:200ms]"
      >
        {m.plans.title}
      </h2>
      {plans.data ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.data.map((plan, index) => (
            <li
              key={plan.id}
              className="animate-tt-card-in"
              style={arrivalDelay(index, CARDS_START_MS)}
            >
              {venue.payAtVenue ? (
                <div className="tt-panel flex h-full items-center gap-3 rounded-2xl p-4">
                  <PlanFace plan={plan} />
                  <span className="tt-tone-off tt-pill shrink-0">
                    <Store size={13} aria-hidden />
                    {m.plans.atDesk}
                  </span>
                </div>
              ) : (
                <Link
                  to="/plans/$planId"
                  params={{ planId: plan.id }}
                  className="tt-card group flex h-full items-center gap-3 p-4 outline-offset-2 active:scale-[0.98]"
                >
                  <PlanFace plan={plan} />
                  <ChevronRight
                    size={20}
                    aria-hidden
                    className="shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-0.5"
                  />
                </Link>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <ul
          role="status"
          aria-label={m.plans.loading}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {Array.from({ length: SKELETON_CARDS }, (_, index) => (
            <li
              key={index}
              className="tt-panel flex animate-tt-fade items-center gap-3 rounded-2xl p-4"
            >
              <Skeleton className="size-11 rounded-xl" />
              <div className="grid flex-1 gap-2">
                <Skeleton className="h-4 w-2/3 rounded-md" />
                <Skeleton className="h-3 w-1/2 rounded-md" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PlanFace({ plan }: { plan: MembershipPlan }) {
  return (
    <>
      <span className="tt-tile tt-hue-membership size-11 rounded-xl transition-transform duration-200 group-hover:scale-105">
        <BadgeCheck size={22} aria-hidden />
      </span>
      <div className="grid min-w-0 flex-1 gap-0.5">
        <h3 className="truncate text-base font-semibold tracking-tight">{plan.name}</h3>
        <p className="flex flex-wrap items-baseline gap-x-1.5 text-sm">
          <span className="font-semibold tabular-nums">{formatMoney(plan.price)}</span>
          <span className="text-muted">· {m.planLength(plan.lengthCount, plan.lengthUnit)}</span>
        </p>
      </div>
    </>
  );
}
