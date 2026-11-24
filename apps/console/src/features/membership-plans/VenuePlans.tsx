import type { MembershipPlan, Venue } from "@turftap/contract/client";
import { formatMoney } from "@turftap/ui";
import { BadgeCheck, CalendarRange, MapPin, PowerOff } from "lucide-react";

import { AddCard, CardCell, CardGrid } from "../../components/CardGrid";
import { EmptyLine, Section } from "../../components/Section";
import { StatePill } from "../../components/StatePill";
import { TopicTile } from "../../components/TopicTile";
import { usePresence } from "../../components/usePresence";
import m from "../../i18n/en/membershipPlans";
import { TurnOffPlan } from "./TurnOffPlan";

export const PLAN_CARD_MIN = "15rem";

type Props = {
  venue: Pick<Venue, "id" | "name">;
  plans: MembershipPlan[];
  canTurnOff: boolean;
  onAdd?: () => void;
};

/** MEM-01. One venue's plans as cards, those on sale first. */
export function VenuePlans({ venue, plans, canTurnOff, onAdd }: Props) {
  const ordered = [...plans].sort((a, b) => Number(b.active) - Number(a.active));
  const shown = usePresence(ordered, (plan) => plan.id);

  return (
    <Section hue="place" icon={MapPin} title={venue.name} count={plans.length}>
      <div className="p-4">
        {plans.length === 0 && !onAdd ? (
          <EmptyLine>{m.noneAtVenue}</EmptyLine>
        ) : (
          <CardGrid label={`${m.title}, ${venue.name}`} min={PLAN_CARD_MIN}>
            {shown.map((present, index) => (
              <CardCell key={present.key} present={present} index={index}>
                <PlanCard plan={present.item} canTurnOff={canTurnOff} />
              </CardCell>
            ))}
            {onAdd && <AddCard label={m.addTitle} onPress={onAdd} />}
          </CardGrid>
        )}
      </div>
    </Section>
  );
}

function PlanCard({ plan, canTurnOff }: { plan: MembershipPlan; canTurnOff: boolean }) {
  return (
    <article
      aria-label={plan.name}
      className={`relative flex w-full flex-col gap-3 tt-card p-4 tt-t1 ${plan.active ? "" : "opacity-70"}`}
    >
      <div className="flex min-h-10 items-center gap-3">
        <TopicTile hue="membership" icon={BadgeCheck} size={40} className="rounded-xl" />
        <h3 className="min-w-0 flex-1 truncate font-semibold">{plan.name}</h3>
        {plan.active
          ? canTurnOff && (
              <span className="-me-1.5">
                <TurnOffPlan plan={plan} />
              </span>
            )
          : null}
      </div>
      <div className="mt-auto flex min-h-9 items-center justify-between gap-2 border-t border-[var(--tt-line)] pt-3 text-sm">
        {plan.active ? (
          <span className="inline-flex items-center gap-1.5 text-muted tabular-nums">
            <CalendarRange aria-hidden size={14} />
            {m.length(plan.lengthCount, plan.lengthUnit)}
          </span>
        ) : (
          <StatePill tone="off" icon={PowerOff} label={m.turnedOff} />
        )}
        <span className="font-semibold tabular-nums tt-hue-money text-[color-mix(in_oklab,var(--tt-hue)_80%,black)]">
          {formatMoney(plan.price)}
        </span>
      </div>
    </article>
  );
}
