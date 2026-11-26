import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { Membership, Venue } from "@turftap/contract/client";
import { getMembershipQueryKey } from "@turftap/contract/client/react-query";
import { ArrowRight } from "lucide-react";
import { useEffect } from "react";

import { TONE_CLASS } from "../../components/look";
import { MEMBERSHIP_ICONS, MEMBERSHIP_TONES } from "../../components/membershipLook";
import { MembershipTicket } from "../../components/MembershipTicket";
import { Journey } from "../../components/Journey";
import m from "../../i18n/en/memberships";
import slots from "../../i18n/en/slots";
import { useNow } from "../../lib/time/useNow";
import { Outcome } from "./Outcome";
import { PaySteps } from "./PaySteps";

const TICK_MS = 1000;

type Props = { membership: Membership; venue: Venue };

/** MEM-02, PAY-01, PAY-02: how to pay for a membership, or where it stands. */
export function MembershipView({ membership, venue }: Props) {
  const now = useNow(TICK_MS);
  const queryClient = useQueryClient();
  const leftMs = membership.expiresAt ? Date.parse(membership.expiresAt) - now : Infinity;
  const timedOut = membership.status === "AWAITING_PAYMENT" && leftMs <= 0;
  const view = timedOut ? "EXPIRED" : membership.status;

  useEffect(() => {
    if (timedOut)
      void queryClient.invalidateQueries({
        queryKey: getMembershipQueryKey({ path: { id: membership.id } }),
      });
  }, [timedOut, membership.id, queryClient]);

  const Stamp = MEMBERSHIP_ICONS[view];
  const ticket = (
    <MembershipTicket
      planName={membership.planName}
      venueName={venue.name}
      startsOn={membership.startsOn}
      endsOn={membership.endsOn}
      holder={membership.customerName}
      stamp={
        <span key={view} className={`${TONE_CLASS[MEMBERSHIP_TONES[view]]} tt-pill animate-tt-pop`}>
          <Stamp size={13} aria-hidden />
          {m.status[view]}
        </span>
      }
    />
  );

  if (view === "AWAITING_PAYMENT") {
    return (
      <div className="mx-auto grid w-full max-w-lg gap-6 lg:max-w-5xl lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-8">
        <PaySteps
          payable={membership}
          paysFor={{ membershipId: membership.id }}
          leftMs={leftMs}
          venuePhone={venue.phone}
          timeZone={venue.timeZone}
        />
        <aside className="animate-tt-card-in [animation-delay:280ms] lg:sticky lg:top-20">
          {ticket}
        </aside>
      </div>
    );
  }

  const again = (
    <Link
      to="/plans/$planId"
      params={{ planId: membership.planId }}
      className="tt-t1 group inline-flex h-10 items-center gap-1.5 rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground hover:bg-[var(--accent-hover)] active:scale-[0.97]"
    >
      {m.done.again}
      <ArrowRight
        size={16}
        aria-hidden
        className="transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );
  const outcome = {
    AWAITING_CHECK: { ...m.done.checking },
    ACTIVE: {
      title: m.done.active.title,
      body: m.done.active.body(
        slots.shortDate(membership.startsOn),
        slots.shortDate(membership.endsOn),
      ),
    },
    EXPIRED: { ...m.done.expired, action: again },
    CANCELLED: {
      title: m.done.cancelled.title,
      body: membership.cancelReason ? m.done.cancelled.reason(membership.cancelReason) : undefined,
    },
    ENDED: {
      title: m.done.ended.title,
      body: m.done.ended.body(slots.shortDate(membership.endsOn)),
      action: again,
    },
  }[view];

  // A membership sold at the desk never went through the online steps.
  const online = membership.amountDue.amount > 0;
  const journeyAt = !online
    ? undefined
    : view === "AWAITING_CHECK"
      ? 3
      : view === "ACTIVE"
        ? 4
        : undefined;
  return (
    <div key={view} className="mx-auto grid w-full max-w-lg gap-5">
      <Outcome tone={MEMBERSHIP_TONES[view]} icon={MEMBERSHIP_ICONS[view]} {...outcome} />
      {journeyAt !== undefined && (
        <div className="tt-panel animate-tt-rise p-5 [animation-delay:260ms]">
          <Journey online at={journeyAt} checking={view === "AWAITING_CHECK"} what="membership" />
        </div>
      )}
      <div className="animate-tt-card-in [animation-delay:320ms]">{ticket}</div>
    </div>
  );
}
