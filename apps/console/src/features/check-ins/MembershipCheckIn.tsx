import { Button, Form } from "@heroui/react";
import { Link } from "@tanstack/react-router";
import { type CheckInRefusal, checkInRefusal } from "@turftap/contract";
import type { CheckIn, Membership, Venue } from "@turftap/contract/client";
import { ApiError, formatMoney, lkr, rupeesOf } from "@turftap/ui";
import {
  BadgeCheck,
  Banknote,
  CalendarClock,
  CalendarRange,
  CalendarX,
  Check,
  CheckCheck,
  CircleAlert,
  CircleX,
  Hourglass,
  LogIn,
  type LucideIcon,
} from "lucide-react";
import { type FormEvent, useState } from "react";

import { Collapse } from "../../components/Collapse";
import { LoadingButton } from "../../components/LoadingButton";
import { TONE_CLASS, type Tone } from "../../components/look";
import { MembershipDaysBar } from "../../components/MembershipDaysBar";
import { PriceField } from "../../components/PriceField";
import { StatePill } from "../../components/StatePill";
import { TopicTile } from "../../components/TopicTile";
import m from "../../i18n/en/checkIns";
import memberships from "../../i18n/en/memberships";
import { useCheckIn, useTakeCash } from "./useCheckIns";

/** Amber asks for something to be done; blue is "not yet"; red is a firm no; grey is over. */
const REFUSAL_LOOK: Record<CheckInRefusal, { tone: Tone; icon: LucideIcon }> = {
  NOT_PAID: { tone: "watch", icon: Hourglass },
  BALANCE_OWED: { tone: "watch", icon: Banknote },
  NOT_STARTED: { tone: "busy", icon: CalendarClock },
  ENDED: { tone: "bad", icon: CalendarX },
  CANCELLED: { tone: "off", icon: CircleX },
};

type Props = {
  membership: Membership;
  venue: Pick<Venue, "timeZone" | "repeatCheckIns">;
  today: string;
  /** This membership's latest check-in today, if any. */
  lastIn: CheckIn | undefined;
  canCheckIn: boolean;
  canTakeCash: boolean;
  index: number;
  onCheckedIn: () => void;
};

/** MEM-05: one membership at the desk, with a big "Check in", or why it can't be used today. */
export function MembershipCheckIn({
  membership,
  venue,
  today,
  lastIn,
  canCheckIn,
  canTakeCash,
  index,
  onCheckedIn,
}: Props) {
  const refusal = checkInRefusal(membership, today);
  const checkIn = useCheckIn();
  const [justIn, setJustIn] = useState<CheckIn>();
  const [isTakingCash, setTakingCash] = useState(false);
  const refused = checkIn.error instanceof ApiError ? checkIn.error : undefined;
  const timeOf = (checkedIn: CheckIn) => m.clock(checkedIn.checkedInAt, venue.timeZone);
  const usedToday = !venue.repeatCheckIns && lastIn !== undefined;

  const press = () =>
    checkIn.mutate(
      { body: { membershipId: membership.id } },
      {
        onSuccess: (reply) => {
          setJustIn(reply.data);
          onCheckedIn();
        },
      },
    );

  const action = () => {
    if (refusal)
      return (
        <Refusal
          refusal={refusal}
          membership={membership}
          onTakeCash={
            refusal === "BALANCE_OWED" && canTakeCash
              ? () => setTakingCash((open) => !open)
              : undefined
          }
          isTakingCash={isTakingCash}
        />
      );
    if (justIn)
      return (
        <div className="flex flex-wrap items-center justify-end gap-3">
          <InMark label={m.inAt(timeOf(justIn))} />
          {venue.repeatCheckIns && canCheckIn && (
            <LoadingButton variant="ghost" size="sm" isPending={checkIn.isPending} onPress={press}>
              {m.checkInAgain}
            </LoadingButton>
          )}
        </div>
      );
    if (usedToday)
      return <StatePill tone="good" icon={CheckCheck} label={m.inToday(timeOf(lastIn))} />;
    if (!canCheckIn) return null;
    return (
      <div className="grid justify-items-end gap-1.5">
        <LoadingButton
          size="lg"
          icon={LogIn}
          isPending={checkIn.isPending}
          onPress={press}
          className="tt-accept min-w-40 animate-tt-pop"
        >
          {m.checkIn}
        </LoadingButton>
        {lastIn && <span className="text-xs text-muted">{m.lastIn(timeOf(lastIn))}</span>}
      </div>
    );
  };

  return (
    <article
      aria-label={membership.planName}
      style={{ animationDelay: `${Math.min(index, 6) * 50}ms` }}
      className={`grid animate-tt-card-in gap-3 tt-card p-4 ${justIn ? "tt-saved" : ""}`}
    >
      <div
        key={refused ? `refused-${checkIn.submittedAt}` : "card"}
        className={`flex flex-wrap items-center gap-4 ${refused ? "animate-tt-nudge" : ""}`}
      >
        <TopicTile hue="membership" icon={BadgeCheck} size={44} className="rounded-xl" />
        <div className="grid min-w-48 flex-1 gap-1.5">
          <h3 className="truncate text-base font-semibold">{membership.planName}</h3>
          <span className="inline-flex items-center gap-1.5 text-sm text-muted tabular-nums">
            <CalendarRange aria-hidden size={14} />
            {memberships.range(membership.startsOn, membership.endsOn)}
          </span>
          {membership.status === "ACTIVE" && (
            <div className="max-w-72">
              <MembershipDaysBar
                startsOn={membership.startsOn}
                endsOn={membership.endsOn}
                today={today}
                index={index}
              />
            </div>
          )}
        </div>
        <div className="ms-auto">{action()}</div>
      </div>
      {refused && (
        <p
          role="alert"
          className="inline-flex animate-tt-rise items-center gap-2 rounded-lg px-3 py-2 text-sm tt-tone-bad tt-tone-text bg-[color-mix(in_oklab,var(--tt-tone)_9%,transparent)]"
        >
          <CircleAlert aria-hidden size={16} className="shrink-0" />
          {refused.message}
        </p>
      )}
      {refusal === "BALANCE_OWED" && canTakeCash && (
        <Collapse isOpen={isTakingCash}>
          <CashForm membership={membership} onDone={() => setTakingCash(false)} />
        </Collapse>
      )}
    </article>
  );
}

type RefusalProps = {
  refusal: CheckInRefusal;
  membership: Membership;
  onTakeCash?: () => void;
  isTakingCash: boolean;
};

/** Why it can't be used, in a box tinted by how serious it is, with the fix when there is one. */
function Refusal({ refusal, membership, onTakeCash, isTakingCash }: RefusalProps) {
  const { tone, icon } = REFUSAL_LOOK[refusal];
  return (
    <div
      className={`flex flex-wrap items-center justify-end gap-3 rounded-xl px-3 py-2 animate-tt-pop ${TONE_CLASS[tone]} bg-[color-mix(in_oklab,var(--tt-tone)_7%,transparent)]`}
    >
      <div className="grid justify-items-end gap-0.5">
        <StatePill tone={tone} icon={icon} label={m.refusals[refusal]} />
        <RefusalDetail refusal={refusal} membership={membership} />
      </div>
      {onTakeCash && (
        <Button
          variant={isTakingCash ? "primary" : "secondary"}
          aria-expanded={isTakingCash}
          onPress={onTakeCash}
        >
          <Banknote aria-hidden size={16} />
          {m.takeCash}
        </Button>
      )}
    </div>
  );
}

function RefusalDetail({
  refusal,
  membership,
}: {
  refusal: CheckInRefusal;
  membership: Membership;
}) {
  const detail = "px-1 text-sm tabular-nums";
  switch (refusal) {
    case "BALANCE_OWED":
      return (
        <span className={`${detail} font-semibold tt-tone-text`}>
          {m.owes} {formatMoney(membership.balance)}
        </span>
      );
    case "NOT_PAID":
      return membership.status === "AWAITING_CHECK" ? (
        <Link to="/receipt-checks" className={`${detail} text-accent hover:underline`}>
          {m.receiptWaiting}
        </Link>
      ) : null;
    case "NOT_STARTED":
      return <span className={`${detail} text-muted`}>{m.startsOn(membership.startsOn)}</span>;
    case "ENDED":
      return <span className={`${detail} text-muted`}>{m.endedOn(membership.endsOn)}</span>;
    case "CANCELLED":
      return null;
  }
}

/** A green tick that lands with a ripple behind it: the customer is in. */
function InMark({ label }: { label: string }) {
  return (
    <span
      role="status"
      className="inline-flex items-center gap-2.5 font-semibold tt-tone-good tt-tone-text"
    >
      <span className="relative grid size-9 place-items-center">
        <span aria-hidden className="absolute inset-0 rounded-full bg-[var(--tt-tone)] tt-ripple" />
        <span className="relative grid size-9 animate-tt-pop place-items-center rounded-full bg-[var(--tt-tone)] text-white">
          <Check aria-hidden size={20} strokeWidth={3} />
        </span>
      </span>
      {label}
    </span>
  );
}

/** PAY-08: any amount up to the Balance; it starts as the whole Balance. */
function CashForm({ membership, onDone }: { membership: Membership; onDone: () => void }) {
  const cash = useTakeCash(membership.id, onDone);
  const [rupees, setRupees] = useState(String(rupeesOf(membership.balance)));
  const refused = cash.error instanceof ApiError ? cash.error : undefined;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    cash.take({ ...lkr(Number(rupees)), currency: membership.balance.currency });
  };

  return (
    <Form
      className="flex flex-wrap items-end gap-3 border-t border-[var(--tt-line)] pt-4"
      onSubmit={submit}
    >
      <TopicTile hue="money" icon={Banknote} size={36} className="mb-0.5" />
      <div className="w-44">
        <PriceField label={m.amountLabel} value={rupees} onChange={setRupees} />
      </div>
      <LoadingButton type="submit" icon={Banknote} isPending={cash.isPending}>
        {m.recordCash}
      </LoadingButton>
      {refused && (
        <p role="alert" className="basis-full text-sm text-danger">
          {refused.message}
        </p>
      )}
    </Form>
  );
}
