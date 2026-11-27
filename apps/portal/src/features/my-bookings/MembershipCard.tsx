import { Link } from "@tanstack/react-router";
import type { Membership, Venue } from "@turftap/contract/client";
import { addDays, daysFrom, onVenueClock } from "@turftap/ui";
import { BadgeCheck, CalendarSync, ChevronRight, MapPin, ScanSearch, Store } from "lucide-react";
import { useRef, useState } from "react";

import { MEMBERSHIP_ICONS, MEMBERSHIP_TONES } from "../../components/membershipLook";
import { TONE_CLASS } from "../../components/look";
import memberships from "../../i18n/en/memberships";
import m from "../../i18n/en/myBookings";
import slots from "../../i18n/en/slots";
import { CancelPanel } from "./CancelPanel";
import { PayTimer } from "./PayTimer";
import { useCancelMembership } from "./useCancelMembership";

/** MEM-06 reminds the customer this many days before the end; the bar turns amber from then on. */
const ENDING_SOON_DAYS = 3;

const QUIET_BUTTON =
  "tt-t1 inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--tt-line-strong)] px-4 text-sm font-medium hover:bg-[var(--tt-hover)] active:scale-[0.97]";
const HUE_BUTTON =
  "tt-t1 inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--tt-hue)] px-4 text-sm font-medium text-white hover:bg-[color-mix(in_oklab,var(--tt-hue)_88%,black)] active:scale-[0.97]";

type Props = {
  membership: Membership;
  venue: Venue | undefined;
  /** The first day of the next membership of the same plan, once it has been renewed. */
  renewedFrom?: string;
  now: number;
  style?: React.CSSProperties;
};

/** POR-04, MEM-02, MEM-04: one membership with its days and state, and what to do about it now. */
export function MembershipCard({ membership, venue, renewedFrom, now, style }: Props) {
  const [confirming, setConfirming] = useState(false);
  const cancel = useCancelMembership(membership.id);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const Stamp = MEMBERSHIP_ICONS[membership.status];
  const today = onVenueClock(new Date(now), venue?.timeZone ?? "UTC").date;
  const finished = MEMBERSHIP_TONES[membership.status] === "off";
  const canCancel = membership.status === "AWAITING_PAYMENT";
  const hasFooter =
    canCancel || membership.status === "AWAITING_CHECK" || membership.status === "ACTIVE";

  const close = () => {
    setConfirming(false);
    cancelButton.current?.focus();
  };

  return (
    <article
      style={{ viewTransitionName: `tt-membership-${membership.id}`, ...style }}
      aria-label={membership.planName}
      className={`tt-card animate-tt-card-in overflow-hidden ${finished ? "opacity-70" : ""}`}
    >
      <Link
        to="/memberships/$membershipId"
        params={{ membershipId: membership.id }}
        className="group grid gap-3 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-inset"
      >
        <div className="flex items-center gap-3">
          <span className="tt-tile tt-hue-membership size-11 shrink-0 rounded-xl">
            <BadgeCheck size={22} aria-hidden />
          </span>
          <div className="grid min-w-0 flex-1 gap-x-2 gap-y-0.5 sm:grid-cols-[minmax(0,1fr)_auto]">
            <h3 className="truncate font-semibold tracking-tight">{membership.planName}</h3>
            <span
              key={membership.status}
              className={`${TONE_CLASS[MEMBERSHIP_TONES[membership.status]]} tt-pill animate-tt-pop justify-self-start max-sm:order-last max-sm:mt-1.5 sm:justify-self-end`}
            >
              <Stamp size={13} aria-hidden />
              {memberships.status[membership.status]}
            </span>
            {venue && (
              <p className="flex items-center gap-1 truncate text-sm text-muted sm:col-span-2">
                <MapPin size={14} aria-hidden className="shrink-0" />
                {venue.name}
              </p>
            )}
            <p className="text-sm font-medium sm:col-span-2">
              {m.membership.dates(
                slots.shortDate(membership.startsOn),
                slots.shortDate(membership.endsOn),
              )}
            </p>
          </div>
          <ChevronRight
            size={18}
            aria-hidden
            className="shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </div>
        {membership.status === "ACTIVE" && <DaysBar membership={membership} today={today} />}
      </Link>

      {hasFooter && (
        <div
          data-card-quiet
          className="mx-4 border-t border-dashed border-[var(--tt-line-strong)]"
        />
      )}
      {hasFooter && (
        <div data-card-quiet className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3">
          <div className="grid min-w-0 flex-1 basis-48 gap-0.5">
            {canCancel && membership.expiresAt && <PayTimer expiresAt={membership.expiresAt} />}
            {membership.status === "AWAITING_CHECK" && (
              <span className="tt-tone-busy tt-tone-text flex items-center gap-1.5 text-sm font-medium">
                <ScanSearch size={15} aria-hidden className="shrink-0" />
                {m.checking}
              </span>
            )}
            {membership.status === "ACTIVE" && (
              <RenewLine
                renewedFrom={renewedFrom}
                nextStart={addDays(membership.endsOn, 1)}
                atDesk={venue?.payAtVenue === true}
              />
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2 max-sm:w-full max-sm:justify-end">
            {canCancel && (
              <button
                ref={cancelButton}
                type="button"
                aria-expanded={confirming}
                onClick={() => setConfirming(true)}
                className={`${QUIET_BUTTON} aria-expanded:bg-[var(--tt-hover)]`}
              >
                {m.cancel}
              </button>
            )}
            {canCancel && (
              <Link
                to="/memberships/$membershipId"
                params={{ membershipId: membership.id }}
                className={`tt-hue-money ${HUE_BUTTON}`}
              >
                {m.sendReceipt}
              </Link>
            )}
            {membership.status === "ACTIVE" && !renewedFrom && venue && !venue.payAtVenue && (
              <Link
                to="/plans/$planId"
                params={{ planId: membership.planId }}
                className={`tt-hue-membership ${HUE_BUTTON}`}
              >
                <CalendarSync size={15} aria-hidden />
                {m.membership.renew}
              </Link>
            )}
          </div>
        </div>
      )}
      {canCancel && (
        <CancelPanel
          title={m.membership.confirmCancel.title}
          body={m.membership.confirmCancel.body}
          paid={membership.paid}
          open={confirming}
          cancelling={cancel.isPending}
          onKeep={close}
          onCancel={() => cancel.mutate()}
        />
      )}
    </article>
  );
}

/** MEM-04: when a renewal would start, that it already has been renewed, or where to renew it. */
function RenewLine({
  renewedFrom,
  nextStart,
  atDesk,
}: {
  renewedFrom?: string;
  nextStart: string;
  atDesk: boolean;
}) {
  if (renewedFrom) {
    return (
      <span className="tt-tone-good tt-tone-text flex items-center gap-1.5 text-sm font-medium">
        <CalendarSync size={15} aria-hidden className="shrink-0" />
        {m.membership.renewed(slots.shortDate(renewedFrom))}
      </span>
    );
  }
  if (atDesk) {
    return (
      <span className="flex items-center gap-1.5 text-sm text-muted">
        <Store size={15} aria-hidden className="shrink-0" />
        {m.membership.renewAtDesk}
      </span>
    );
  }
  return (
    <span className="text-sm text-pretty text-muted">
      {m.membership.renewFrom(slots.shortDate(nextStart))}
    </span>
  );
}

/** The days used so far as a bar, with how many are left. */
function DaysBar({ membership, today }: { membership: Membership; today: string }) {
  const { startsOn, endsOn } = membership;
  if (today < startsOn) {
    return (
      <p className="tt-tone-busy tt-tone-text text-sm font-medium">
        {m.membership.startsIn(daysFrom(today, startsOn))}
      </p>
    );
  }
  const total = daysFrom(startsOn, endsOn) + 1;
  const left = daysFrom(today, endsOn);
  const used = total - left;
  const tone = left <= ENDING_SOON_DAYS ? "tt-tone-watch" : "tt-tone-good";
  return (
    <div className={`${tone} grid gap-1.5`}>
      <span
        role="meter"
        aria-label={m.membership.used}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={used}
        className="h-2 overflow-hidden rounded-full bg-[var(--tt-hover)]"
      >
        <span
          className="block h-full origin-left animate-tt-grow rounded-full bg-[var(--tt-tone)]"
          style={{ width: `${(used / total) * 100}%` }}
        />
      </span>
      <span className="tt-tone-text text-sm font-medium">
        {left === 0 ? m.membership.lastDay : m.membership.daysLeft(left)}
      </span>
    </div>
  );
}
