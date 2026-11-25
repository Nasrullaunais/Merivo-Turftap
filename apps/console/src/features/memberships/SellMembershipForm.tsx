import { Alert, Description, FieldError, Form, Input, Label, TextField } from "@heroui/react";
import {
  membershipLastDay,
  PhoneInput,
  WALK_IN_PAYMENTS,
  type WalkInPayment,
} from "@turftap/contract";
import type { MembershipPlan, Venue } from "@turftap/contract/client";
import { ApiError, formatMoney } from "@turftap/ui";
import { BadgeCheck, Banknote, Check, Clock, MapPin, RefreshCw, UserCheck } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Radio, RadioGroup } from "react-aria-components";

import { Collapse } from "../../components/Collapse";
import { LoadingButton } from "../../components/LoadingButton";
import { ChoicePills } from "../../components/Pills";
import { TopicTile } from "../../components/TopicTile";
import planWords from "../../i18n/en/membershipPlans";
import m from "../../i18n/en/memberships";
import { useCustomerByPhone } from "../../lib/customers/useCustomerByPhone";
import { addDays, daysFrom, onVenueClock } from "../../lib/time/venueClock";
import { useCurrentLastDay, useSellMembership } from "./useMemberships";

// A wrong "paid in cash" records money nobody took; a wrong "pay later" only leaves a Balance.
const DEFAULT_PAYMENT: WalkInPayment = "PAY_LATER";
const PAYMENT_ICONS = { CASH: Banknote, PAY_LATER: Clock };

export type PlacePlans = { venue: Venue; plans: MembershipPlan[] };

type Props = {
  places: PlacePlans[];
  onSold: (membershipId: number) => void;
};

/** MEM-03: sell a membership to someone at the desk; it is active straight away. */
export function SellMembershipForm({ places, onSold }: Props) {
  const sell = useSellMembership(onSold);
  const [now] = useState(() => new Date());
  const [venueId, setVenueId] = useState(places[0]!.venue.id);
  const place = places.find((each) => each.venue.id === venueId) ?? places[0]!;
  const today = onVenueClock(now, place.venue.timeZone).date;
  const [planId, setPlanId] = useState(place.plans[0]?.id);
  const plan = place.plans.find((each) => each.id === planId);
  const [phone, setPhone] = useState("");
  const [typedName, setTypedName] = useState("");
  const [startsOn, setStartsOn] = useState(today);
  const [payment, setPayment] = useState<WalkInPayment>(DEFAULT_PAYMENT);
  const { data: customer } = useCustomerByPhone(phone);
  const { data: currentLastDay } = useCurrentLastDay(customer?.id, plan?.id);
  const refused = sell.error instanceof ApiError ? sell.error : undefined;

  const pickVenue = (picked: string) => {
    const next = places.find((each) => each.venue.id === Number(picked))!;
    setVenueId(next.venue.id);
    setPlanId(next.plans[0]?.id);
    sell.reset();
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!plan) return;
    sell.mutate({
      body: {
        planId: plan.id,
        startsOn,
        walkIn: { customerName: customer?.name ?? typedName.trim(), customerPhone: phone, payment },
      },
    });
  };

  return (
    <Form className="grid gap-5" onSubmit={submit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          name="phone"
          type="tel"
          isRequired
          autoFocus
          value={phone}
          onChange={setPhone}
          validate={(value) => (PhoneInput.safeParse(value).success ? null : m.phoneInvalid)}
        >
          <Label>{m.phoneLabel}</Label>
          <Input placeholder="077 123 4567" />
          <FieldError />
        </TextField>
        <TextField
          name="name"
          isRequired
          isReadOnly={customer !== undefined}
          value={customer?.name ?? typedName}
          onChange={setTypedName}
        >
          <Label>{m.nameLabel}</Label>
          <Input key={customer?.id} className={customer ? "tt-hue-people tt-flash" : ""} />
          {customer && (
            <Description className="inline-flex animate-tt-pop items-center gap-1">
              <UserCheck aria-hidden size={14} />
              {m.existingCustomer}
            </Description>
          )}
          <FieldError />
        </TextField>
      </div>
      {places.length > 1 && (
        <ChoicePills
          name="venueId"
          label={m.venueLabel}
          value={String(venueId)}
          onChange={pickVenue}
          choices={places.map(({ venue }) => ({
            value: String(venue.id),
            label: venue.name,
            icon: MapPin,
          }))}
        />
      )}
      <PlanChoice
        key={venueId}
        plans={place.plans}
        value={planId}
        onChange={(picked) => {
          setPlanId(picked);
          sell.reset();
        }}
      />
      <div className="grid gap-4 sm:grid-cols-[12rem_1fr] sm:items-start">
        <TextField
          name="startsOn"
          type="date"
          isRequired
          value={startsOn}
          onChange={setStartsOn}
          validate={(value) => (value >= today ? null : m.startInPast)}
        >
          <Label>{m.startLabel}</Label>
          <Input min={today} />
          <FieldError />
        </TextField>
        <ChoicePills
          name="payment"
          label={m.paymentLabel}
          value={payment}
          onChange={setPayment}
          choices={WALK_IN_PAYMENTS.map((value) => ({
            value,
            label: m.payments[value],
            icon: PAYMENT_ICONS[value],
          }))}
        />
      </div>
      {plan && (
        <SaleSummary
          plan={plan}
          startsOn={startsOn >= today ? startsOn : today}
          currentLastDay={currentLastDay}
          payment={payment}
        />
      )}
      {refused && (
        <Alert status="danger" role="alert" className="animate-tt-rise">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{refused.message}</Alert.Title>
          </Alert.Content>
        </Alert>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <LoadingButton type="submit" icon={BadgeCheck} isPending={sell.isPending}>
          {m.submit}
        </LoadingButton>
        <span className="text-sm text-muted">{m.customerTold}</span>
      </div>
    </Form>
  );
}

type PlanChoiceProps = {
  plans: MembershipPlan[];
  value: number | undefined;
  onChange: (planId: number) => void;
};

/** The plans on sale as cards to pick from: name, length and price all in view. */
function PlanChoice({ plans, value, onChange }: PlanChoiceProps) {
  if (plans.length === 0) return <p className="text-sm text-muted">{m.noPlansAtVenue}</p>;
  return (
    <RadioGroup
      name="planId"
      isRequired
      value={value === undefined ? null : String(value)}
      onChange={(picked) => onChange(Number(picked))}
      className="grid gap-2"
    >
      <Label>{m.planLabel}</Label>
      <div className="grid gap-2 tt-sweep sm:grid-cols-2">
        {plans.map((plan, index) => (
          <Radio
            key={plan.id}
            value={String(plan.id)}
            style={{ "--i": index } as React.CSSProperties}
            className="group relative flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--tt-line)] bg-[var(--tt-panel)] p-3 outline-none tt-t1 select-none hover:bg-[var(--tt-hover)] data-focus-visible:ring-2 data-focus-visible:ring-focus data-pressed:scale-[0.985] data-selected:border-[var(--tt-hue-membership)] data-selected:bg-[color-mix(in_oklab,var(--tt-hue-membership)_7%,var(--tt-panel))]"
          >
            <TopicTile hue="membership" icon={BadgeCheck} size={36} className="rounded-xl" />
            <span className="grid min-w-0 flex-1">
              <span className="truncate font-medium">{plan.name}</span>
              <span className="text-sm text-muted tabular-nums">
                {planWords.length(plan.lengthCount, plan.lengthUnit)} · {formatMoney(plan.price)}
              </span>
            </span>
            <span
              aria-hidden
              className="grid size-5 shrink-0 scale-50 place-items-center rounded-full bg-[var(--tt-hue-membership)] text-white opacity-0 transition-[opacity,scale] duration-(--tt-dur-2) ease-(--tt-ease-pop) group-data-selected:scale-100 group-data-selected:opacity-100"
            >
              <Check size={12} strokeWidth={3.5} />
            </span>
          </Radio>
        ))}
      </div>
    </RadioGroup>
  );
}

type SummaryProps = {
  plan: MembershipPlan;
  startsOn: string;
  currentLastDay: string | undefined;
  payment: WalkInPayment;
};

/** What is being sold, as the server will work it out (D-28, MEM-04), before it is sent. */
function SaleSummary({ plan, startsOn, currentLastDay, payment }: SummaryProps) {
  const afterCurrent = currentLastDay ? addDays(currentLastDay, 1) : undefined;
  const first = afterCurrent && afterCurrent > startsOn ? afterCurrent : startsOn;
  const last = membershipLastDay(first, plan.lengthCount, plan.lengthUnit);
  const balance = payment === "CASH" ? { ...plan.price, amount: 0 } : plan.price;
  return (
    <section
      aria-label={plan.name}
      className="grid gap-3 rounded-2xl border border-[var(--tt-line)] bg-[color-mix(in_oklab,var(--tt-hue-membership)_5%,var(--tt-panel))] p-4 tt-hue-membership"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <span key={`${first}-${last}`} className="animate-tt-pop font-semibold tabular-nums">
          {m.runs(first, last)}
        </span>
        <span className="text-sm text-muted tabular-nums">
          {m.length(daysFrom(first, last) + 1)}
        </span>
      </div>
      <Collapse isOpen={currentLastDay !== undefined && first === afterCurrent}>
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[color-mix(in_oklab,var(--tt-hue)_75%,black)]">
          <RefreshCw aria-hidden size={14} />
          {currentLastDay && m.renews(currentLastDay)}
        </span>
      </Collapse>
      <dl className="grid grid-cols-2 gap-3 border-t border-[var(--tt-line)] pt-3">
        <div className="grid gap-0.5">
          <dt className="text-xs text-muted">{m.price}</dt>
          <dd className="font-semibold tabular-nums">{formatMoney(plan.price)}</dd>
        </div>
        <div className="grid justify-items-end gap-0.5">
          <dt className="text-xs text-muted">{m.balance}</dt>
          <dd
            key={`${payment}-${plan.id}`}
            className={`animate-tt-pop font-semibold tabular-nums ${balance.amount > 0 ? "tt-tone-watch tt-tone-text" : ""}`}
          >
            {formatMoney(balance)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
