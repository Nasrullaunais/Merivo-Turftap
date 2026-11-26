import { Button, Skeleton, Spinner } from "@heroui/react";
import { Link } from "@tanstack/react-router";
import { membershipLastDay } from "@turftap/contract";
import type { Membership, MembershipPlan, Venue } from "@turftap/contract/client";
import { addDays, formatMoney, onVenueClock } from "@turftap/ui";
import { ArrowRight, CalendarSync, Hourglass, ScanSearch, Store } from "lucide-react";

import { DateStrip } from "../../components/DateStrip";
import { Journey } from "../../components/Journey";
import { MembershipTicket } from "../../components/MembershipTicket";
import common from "../../i18n/en/common";
import m from "../../i18n/en/memberships";
import slots from "../../i18n/en/slots";
import { useNow } from "../../lib/time/useNow";
import { useBuyMembership } from "./useBuyMembership";
import { useMyMembershipsOf } from "./usePlans";

/** How far ahead a new membership can start: the same 30 days a booking can be made. */
const START_WITHIN_DAYS = 30;
/** Today moves on at midnight while the page stays open. */
const CLOCK_TICK_MS = 60_000;

type Props = {
  plan: MembershipPlan;
  venue: Venue;
  customerName?: string;
  /** The day picked, from the address; today when missing or out of range. */
  asked?: string;
  onPickDay: (date: string) => void;
  onBought: (membershipId: number) => void;
};

type Waiting = Membership & { status: "AWAITING_PAYMENT" | "AWAITING_CHECK" };

const isWaiting = (membership: Membership): membership is Waiting =>
  membership.status === "AWAITING_PAYMENT" || membership.status === "AWAITING_CHECK";

/** MEM-02, MEM-04: the start day, the end it gives, the price, then one press to buy. */
export function BuyStep({ plan, venue, customerName, asked, onPickDay, onBought }: Props) {
  const mine = useMyMembershipsOf(plan.id);
  const buy = useBuyMembership();
  const today = onVenueClock(new Date(useNow(CLOCK_TICK_MS)), venue.timeZone).date;
  const days = Array.from({ length: START_WITHIN_DAYS + 1 }, (_, index) => addDays(today, index));

  const waiting = mine.data?.find(isWaiting);
  // MEM-04: with an active one of this plan, the new one starts the day after the last one ends.
  const lastActiveDay = mine.data
    ?.filter((membership) => membership.status === "ACTIVE" && membership.endsOn >= today)
    .map((membership) => membership.endsOn)
    .sort()
    .at(-1);
  const renewing = lastActiveDay !== undefined;
  const startsOn = lastActiveDay
    ? addDays(lastActiveDay, 1)
    : asked && days.includes(asked)
      ? asked
      : today;
  const endsOn = membershipLastDay(startsOn, plan.lengthCount, plan.lengthUnit);
  const limit = common.lengthOf(venue.paymentTimeLimitMinutes);

  const submit = () =>
    buy.mutate(
      { body: { planId: plan.id, startsOn } },
      { onSuccess: (reply) => onBought(reply.data.id) },
    );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-8">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5">
        <h1 className="animate-tt-rise text-2xl font-semibold tracking-tight [animation-delay:60ms]">
          {renewing ? m.buy.renewTitle : m.buy.title}
        </h1>

        {!mine.data ? (
          <Skeleton className="h-28 rounded-2xl" />
        ) : renewing ? (
          <section className="tt-hue-membership tt-panel flex animate-tt-rise items-center gap-4 p-4 [animation-delay:100ms]">
            <span className="tt-tile size-11 shrink-0 animate-tt-pop rounded-xl">
              <CalendarSync size={22} aria-hidden />
            </span>
            <div className="grid gap-0.5">
              <h2 className="font-semibold tracking-tight">
                {m.buy.renewStarts(slots.shortDate(startsOn))}
              </h2>
              <p className="text-sm text-pretty text-muted">{m.buy.renewWhy}</p>
            </div>
          </section>
        ) : (
          <section
            aria-labelledby="start-title"
            className="grid min-w-0 animate-tt-rise grid-cols-[minmax(0,1fr)] gap-3 [animation-delay:100ms]"
          >
            <h2 id="start-title" className="font-semibold tracking-tight">
              {m.buy.when}
            </h2>
            <DateStrip dates={days} value={startsOn} onChange={onPickDay} />
          </section>
        )}

        <div className="animate-tt-card-in [animation-delay:160ms]">
          <MembershipTicket
            planName={plan.name}
            venueName={venue.name}
            startsOn={startsOn}
            endsOn={endsOn}
            holder={customerName}
          />
        </div>
      </div>

      <section className="tt-panel grid animate-tt-card-in gap-6 p-5 [animation-delay:220ms] lg:sticky lg:top-20 lg:mt-13">
        <div className="grid gap-1">
          <span className="text-sm text-muted">{m.buy.price}</span>
          <span className="text-3xl font-bold tracking-tight tabular-nums">
            {formatMoney(plan.price)}
          </span>
          <span className="tt-hue-money flex items-center gap-1.5 text-sm font-medium text-[var(--tt-hue)]">
            {m.buy.paidHow}
          </span>
        </div>

        {!venue.payAtVenue && (
          <div className="border-t border-[var(--tt-line)] pt-5">
            <Journey online at={0} timeLimit={limit} what="membership" />
            <p className="sr-only">{m.buy.timeLimit(limit)}</p>
          </div>
        )}

        {venue.payAtVenue ? (
          <Notice
            tone="tt-tone-off"
            icon={<Store size={20} aria-hidden />}
            title={m.buy.atDesk.title}
            body={m.buy.atDesk.body(venue.name)}
          />
        ) : waiting ? (
          <Notice
            tone={waiting.status === "AWAITING_CHECK" ? "tt-tone-busy" : "tt-tone-watch"}
            icon={
              waiting.status === "AWAITING_CHECK" ? (
                <ScanSearch size={20} aria-hidden />
              ) : (
                <Hourglass size={20} aria-hidden />
              )
            }
            {...m.buy.waiting[waiting.status]}
          >
            <Link
              to="/memberships/$membershipId"
              params={{ membershipId: waiting.id }}
              className="tt-t1 group inline-flex h-10 items-center gap-1.5 rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground hover:bg-[var(--accent-hover)] active:scale-[0.97]"
            >
              {m.buy.waiting.open}
              <ArrowRight
                size={16}
                aria-hidden
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </Notice>
        ) : (
          <Button
            fullWidth
            size="lg"
            className="group"
            isPending={buy.isPending}
            isDisabled={!mine.data}
            onPress={submit}
          >
            {buy.isPending ? (
              <Spinner color="current" size="sm" />
            ) : renewing ? (
              m.buy.renewSubmit
            ) : (
              m.buy.submit
            )}
            {!buy.isPending && (
              <ArrowRight
                size={18}
                aria-hidden
                className="transition-transform group-hover:translate-x-0.5"
              />
            )}
          </Button>
        )}
      </section>
    </div>
  );
}

type NoticeProps = {
  tone: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  children?: React.ReactNode;
};

/** Why Buy isn't offered, and the way forward when there is one. */
function Notice({ tone, icon, title, body, children }: NoticeProps) {
  return (
    <div
      role="status"
      className={`${tone} grid animate-tt-rise justify-items-start gap-3 rounded-xl bg-[color-mix(in_oklab,var(--tt-tone)_10%,var(--tt-panel))] p-4`}
    >
      <span className="tt-status-badge !size-11 !rounded-xl">{icon}</span>
      <div className="grid gap-1">
        <h2 className="font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-pretty text-muted">{body}</p>
      </div>
      {children}
    </div>
  );
}
