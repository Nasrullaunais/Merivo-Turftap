import type { Membership, Venue } from "@turftap/contract/client";
import { daysFrom, onVenueClock } from "@turftap/ui";
import { BadgeCheck, MapPin } from "lucide-react";

import { MEMBERSHIP_ICONS, MEMBERSHIP_TONES } from "../../components/membershipLook";
import { TONE_CLASS } from "../../components/look";
import m from "../../i18n/en/myBookings";
import slots from "../../i18n/en/slots";

/** MEM-06 reminds the customer this many days before the end; the bar turns amber from then on. */
const ENDING_SOON_DAYS = 3;

type Props = {
  membership: Membership;
  venue: Venue | undefined;
  now: number;
  style?: React.CSSProperties;
};

/** POR-04: one membership with its days and state; renewing comes with T32. */
export function MembershipCard({ membership, venue, now, style }: Props) {
  const Stamp = MEMBERSHIP_ICONS[membership.status];
  const today = onVenueClock(new Date(now), venue?.timeZone ?? "UTC").date;
  const finished = MEMBERSHIP_TONES[membership.status] === "off";

  return (
    <article
      style={style}
      aria-label={membership.planName}
      className={`tt-card grid animate-tt-card-in gap-3 p-4 ${finished ? "opacity-70" : ""}`}
    >
      <div className="flex items-start gap-3">
        <span className="tt-tile tt-hue-membership size-11 rounded-xl">
          <BadgeCheck size={22} aria-hidden />
        </span>
        <div className="grid min-w-0 flex-1 gap-0.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate font-semibold tracking-tight">{membership.planName}</h3>
            <span
              className={`${TONE_CLASS[MEMBERSHIP_TONES[membership.status]]} tt-pill shrink-0 animate-tt-pop`}
            >
              <Stamp size={13} aria-hidden />
              {m.membership.status[membership.status]}
            </span>
          </div>
          {venue && (
            <p className="flex items-center gap-1 truncate text-sm text-muted">
              <MapPin size={14} aria-hidden className="shrink-0" />
              {venue.name}
            </p>
          )}
          <p className="text-sm font-medium">
            {m.membership.dates(
              slots.shortDate(membership.startsOn),
              slots.shortDate(membership.endsOn),
            )}
          </p>
        </div>
      </div>
      {membership.status === "ACTIVE" && <DaysBar membership={membership} today={today} />}
    </article>
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
