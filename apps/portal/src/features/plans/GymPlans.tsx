import { Skeleton } from "@heroui/react";
import { Link } from "@tanstack/react-router";
import { membershipLastDay } from "@turftap/contract";
import type { MembershipPlan, Venue } from "@turftap/contract/client";
import { daysFrom, formatMoney, onVenueClock } from "@turftap/ui";
import { ArrowRight, BadgeCheck, Sparkles, Store } from "lucide-react";

import { arrivalDelay } from "../../components/look";
import m from "../../i18n/en/memberships";
import { useNow } from "../../lib/time/useNow";
import { usePlans } from "./usePlans";

const CARDS_START_MS = 240;
const SKELETON_CARDS = 2;
const CENTS_PER_RUPEE = 100;
const RECHECK_MS = 60_000;

/** MEM-02: a gym's Membership Plans with their price, length and cost a day. A tap starts buying one. */
export function GymPlans({ venue }: { venue: Venue }) {
  const plans = usePlans(venue.id, venue.hasGym);
  const now = useNow(RECHECK_MS);

  if (!venue.hasGym || plans.data?.length === 0) return null;
  const today = onVenueClock(new Date(now), venue.timeZone).date;
  const daily = (plan: MembershipPlan) =>
    plan.price.amount /
    (daysFrom(today, membershipLastDay(today, plan.lengthCount, plan.lengthUnit)) + 1);
  const cheapest =
    plans.data && plans.data.length > 1
      ? plans.data.toSorted((a, b) => daily(a) - daily(b))[0]
      : undefined;

  return (
    <section aria-labelledby="plans-title" className="grid gap-4">
      <h2
        id="plans-title"
        className="animate-tt-rise text-xl font-semibold tracking-tight [animation-delay:200ms]"
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
              <PlanCard
                plan={plan}
                venue={venue}
                perDay={{
                  amount: Math.round(daily(plan) / CENTS_PER_RUPEE) * CENTS_PER_RUPEE,
                  currency: plan.price.currency,
                }}
                best={plan === cheapest}
              />
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
            <li key={index} className="tt-panel grid animate-tt-fade gap-3 rounded-3xl p-5">
              <Skeleton className="size-11 rounded-xl" />
              <Skeleton className="h-7 w-1/2 rounded-md" />
              <Skeleton className="h-4 w-2/3 rounded-md" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

type CardProps = {
  plan: MembershipPlan;
  venue: Venue;
  perDay: MembershipPlan["price"];
  best: boolean;
};

function PlanCard({ plan, venue, perDay, best }: CardProps) {
  const face = (
    <>
      <div className="flex items-center gap-3">
        <span className="tt-tile tt-hue-membership size-11 rounded-xl transition-transform duration-200 group-hover:scale-110">
          <BadgeCheck size={22} aria-hidden />
        </span>
        <h3 className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight">
          {plan.name}
        </h3>
        {best && (
          <span className="tt-tone-good tt-pill shrink-0">
            <Sparkles size={13} aria-hidden />
            {m.plans.bestValue}
          </span>
        )}
      </div>
      <div className="flex items-end gap-3">
        <div className="grid min-w-0 flex-1 gap-0.5">
          <p className="text-2xl font-semibold tracking-tight tabular-nums">
            {formatMoney(plan.price)}
          </p>
          <p className="text-sm text-muted">
            {m.planLength(plan.lengthCount, plan.lengthUnit)} ·{" "}
            <span className="tabular-nums">{m.plans.perDay(formatMoney(perDay))}</span>
          </p>
        </div>
        {venue.payAtVenue ? (
          <span className="tt-tone-off tt-pill shrink-0">
            <Store size={13} aria-hidden />
            {m.plans.atDesk}
          </span>
        ) : (
          <span
            aria-hidden
            className="tt-hue-membership grid size-11 shrink-0 place-items-center rounded-full bg-[color-mix(in_oklab,var(--tt-hue)_13%,var(--tt-panel))] text-[var(--tt-hue)] transition-[background-color,color,translate] duration-200 group-hover:translate-x-0.5 group-hover:bg-[var(--tt-hue)] group-hover:text-white"
          >
            <ArrowRight size={20} />
          </span>
        )}
      </div>
    </>
  );
  if (venue.payAtVenue) {
    return <div className="tt-panel grid h-full gap-4 rounded-3xl p-5">{face}</div>;
  }
  return (
    <Link
      to="/plans/$planId"
      params={{ planId: plan.id }}
      data-best={best}
      className="tt-card group grid h-full gap-4 rounded-3xl p-5 outline-offset-2 active:scale-[0.98] data-[best=true]:ring-2 data-[best=true]:ring-[color-mix(in_oklab,var(--tt-tone-good)_45%,transparent)]"
    >
      {face}
    </Link>
  );
}
