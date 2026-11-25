import type { Membership, Venue } from "@turftap/contract/client";
import { formatMoney } from "@turftap/ui";
import { BadgeCheck, CalendarRange, MapPin, Phone, SearchX } from "lucide-react";
import type { ReactNode } from "react";

import { CardCell, CardGrid } from "../../components/CardGrid";
import { EmptyState } from "../../components/EmptyState";
import { MembershipDaysBar } from "../../components/MembershipDaysBar";
import { MEMBERSHIP_ICONS, MEMBERSHIP_TONES } from "../../components/membershipLook";
import { StateDot, StatePill } from "../../components/StatePill";
import { TopicTile } from "../../components/TopicTile";
import { usePresence } from "../../components/usePresence";
import m from "../../i18n/en/memberships";

export const CARD_MIN = "19rem";

type Props = {
  memberships: Membership[];
  venues: Map<number, Pick<Venue, "name" | "timeZone">>;
  todayAt: (venueId: number) => string | undefined;
  isFiltered: boolean;
  empty?: ReactNode;
};

/** MEM-02, MEM-03: each membership as a card; how far through it is shows as a bar. */
export function MembershipCards({ memberships, venues, todayAt, isFiltered, empty }: Props) {
  const shown = usePresence(memberships, (membership) => membership.id);
  if (shown.length === 0)
    return isFiltered ? (
      <EmptyState hue="membership" icon={SearchX}>
        {m.noMatches}
      </EmptyState>
    ) : (
      empty
    );
  const showVenue = venues.size > 1;
  return (
    <CardGrid label={m.title} min={CARD_MIN}>
      {shown.map((present, index) => (
        <CardCell key={present.key} present={present} index={index}>
          <MembershipCard
            membership={present.item}
            today={todayAt(present.item.venueId)}
            venueName={showVenue ? venues.get(present.item.venueId)?.name : undefined}
            index={index}
          />
        </CardCell>
      ))}
    </CardGrid>
  );
}

type CardProps = {
  membership: Membership;
  today: string | undefined;
  venueName: string | undefined;
  index: number;
};

function MembershipCard({ membership, today, venueName, index }: CardProps) {
  const { status } = membership;
  return (
    <article
      aria-label={membership.customerName}
      className="flex w-full flex-col gap-4 tt-card p-4"
    >
      <div className="flex items-start gap-3">
        <TopicTile hue="membership" icon={BadgeCheck} size={40} className="rounded-xl" />
        <div className="grid min-w-0 flex-1 gap-0.5">
          <h3 className="truncate font-semibold">{membership.customerName}</h3>
          <span className="inline-flex items-center gap-1.5 text-sm text-muted tabular-nums">
            <Phone aria-hidden size={13} />
            {membership.customerPhone}
          </span>
        </div>
        <StatePill
          key={status}
          className="animate-tt-pop"
          tone={MEMBERSHIP_TONES[status]}
          icon={MEMBERSHIP_ICONS[status]}
          label={m.states[status]}
        />
      </div>
      <div className="grid gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <span className="truncate font-medium">{membership.planName}</span>
          {venueName && (
            <span className="inline-flex min-w-0 items-center gap-1 truncate text-xs text-muted">
              <MapPin aria-hidden size={12} className="shrink-0" />
              {venueName}
            </span>
          )}
        </div>
        <span className="inline-flex items-center gap-1.5 text-sm text-muted tabular-nums">
          <CalendarRange aria-hidden size={14} />
          {m.range(membership.startsOn, membership.endsOn)}
        </span>
        {status === "ACTIVE" && today && (
          <MembershipDaysBar
            startsOn={membership.startsOn}
            endsOn={membership.endsOn}
            today={today}
            index={index}
          />
        )}
      </div>
      <div className="mt-auto flex min-h-9 items-center justify-between gap-2 border-t border-[var(--tt-line)] pt-3 text-sm">
        <span className="font-semibold tabular-nums tt-hue-money text-[color-mix(in_oklab,var(--tt-hue)_80%,black)]">
          {formatMoney(membership.price)}
        </span>
        <Settled membership={membership} />
      </div>
    </article>
  );
}

/** A Balance is taken at the desk once the membership is live; until then the pill says it all. */
function Settled({ membership }: { membership: Membership }) {
  if (membership.status !== "ACTIVE" && membership.status !== "ENDED") return null;
  if (membership.balance.amount > 0)
    return <StateDot tone="watch" label={`${m.balance} ${formatMoney(membership.balance)}`} />;
  return membership.paid.amount > 0 ? <StateDot tone="good" label={m.paid} /> : null;
}
