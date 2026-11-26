import {
  Alert,
  Description,
  FieldError,
  Form,
  Input,
  Label,
  NumberField,
  Switch,
  TextField,
} from "@heroui/react";
import {
  MAX_SERIES_WEEKS,
  MIN_SERIES_WEEKS,
  PhoneInput,
  WALK_IN_PAYMENTS,
  type WalkInPayment,
} from "@turftap/contract";
import type { Resource } from "@turftap/contract/client";
import { addDays, ApiError, formatMoney, onVenueClock } from "@turftap/ui";
import { Banknote, CalendarCheck, Clock, UserCheck } from "lucide-react";
import { type FormEvent, useState } from "react";

import { Collapse } from "../../components/Collapse";
import { LoadingButton } from "../../components/LoadingButton";
import { ChoicePills } from "../../components/Pills";
import { TYPE_ICONS } from "../../components/resourceLook";
import { SkeletonLine } from "../../components/SkeletonRows";
import { TopicTile } from "../../components/TopicTile";
import m from "../../i18n/en/walkIns";
import { useCustomerByPhone } from "../../lib/customers/useCustomerByPhone";
import { SeriesClashes } from "./SeriesClashes";
import { useBookSeries, useBookWalkIn, useSlotsFrom } from "./useWalkIn";

const MS_PER_MINUTE = 60_000;
// A wrong "paid in cash" records money nobody took; a wrong "pay later" only leaves a Balance.
const DEFAULT_PAYMENT: WalkInPayment = "PAY_LATER";
const PAYMENT_ICONS = { CASH: Banknote, PAY_LATER: Clock };
const DEFAULT_SERIES_WEEKS = 4;
const DAYS_PER_WEEK = 7;

type Props = {
  resource: Resource;
  startsAt: string;
  timeZone: string;
  /** BKG-09: only an Owner or Manager may book a Repeat Series. */
  canRepeat: boolean;
  onBooked: () => void;
};

/** BKG-04, BKG-09: staff book a free slot, once or every week, for someone at the desk or on the phone. */
export function WalkInForm({ resource, startsAt, timeZone, canRepeat, onBooked }: Props) {
  const date = onVenueClock(startsAt, timeZone).date;
  const [slots, setSlots] = useState(1);
  const { isPending, freeInARow, quote } = useSlotsFrom(resource, startsAt, date, slots);
  const endsAt = new Date(
    Date.parse(startsAt) + slots * resource.slotMinutes * MS_PER_MINUTE,
  ).toISOString();

  return (
    <div className="grid gap-5">
      <div className="flex items-center gap-3 rounded-2xl border border-[var(--tt-line)] p-3">
        <TopicTile hue="place" icon={TYPE_ICONS[resource.type]} size={40} className="rounded-xl" />
        <div className="grid min-w-0 flex-1">
          <span className="truncate font-semibold">{resource.name}</span>
          <span className="text-sm text-muted tabular-nums">
            {m.when(startsAt, endsAt, timeZone)}
          </span>
        </div>
        <div className="grid justify-items-end">
          <span className="text-xs text-muted">{m.price}</span>
          {quote ? (
            <span
              key={quote.price.amount}
              className="animate-tt-pop text-lg font-semibold tabular-nums"
            >
              {formatMoney(quote.price)}
            </span>
          ) : (
            <SkeletonLine label={m.loading} className="h-6 w-24" />
          )}
        </div>
      </div>
      {!isPending && freeInARow === 0 && (
        <Alert status="danger" role="alert">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{m.notBookable}</Alert.Title>
          </Alert.Content>
        </Alert>
      )}
      {freeInARow > 0 && (
        <WalkInFields
          resource={resource}
          startsAt={startsAt}
          date={date}
          slots={slots}
          onSlotsChange={setSlots}
          freeInARow={freeInARow}
          price={quote?.price}
          canRepeat={canRepeat}
          onBooked={onBooked}
        />
      )}
    </div>
  );
}

type FieldsProps = {
  resource: Resource;
  startsAt: string;
  date: string;
  slots: number;
  onSlotsChange: (slots: number) => void;
  freeInARow: number;
  price: Resource["price"] | undefined;
  canRepeat: boolean;
  onBooked: () => void;
};

function WalkInFields(props: FieldsProps) {
  const { resource, startsAt, date, slots, freeInARow, price, canRepeat, ...on } = props;
  const book = useBookWalkIn(resource.id, date, on.onBooked);
  const series = useBookSeries(on.onBooked);
  const [phone, setPhone] = useState("");
  const [typedName, setTypedName] = useState("");
  const [payment, setPayment] = useState<WalkInPayment>(DEFAULT_PAYMENT);
  const [repeat, setRepeat] = useState(false);
  const [weeks, setWeeks] = useState(DEFAULT_SERIES_WEEKS);
  const [skipped, setSkipped] = useState<string[]>([]);
  // Kept apart from the error, which clears while skipping them is sent.
  const [clashes, setClashes] = useState<string[]>([]);
  const { data: customer } = useCustomerByPhone(phone);
  const failed = repeat ? series.error : book.error;
  const refused = failed instanceof ApiError ? failed : undefined;
  const customerName = customer?.name ?? typedName.trim();

  // A changed series may clash on other weeks, so earlier clashes and skips no longer apply.
  const changeSeries = (change: () => void) => {
    change();
    series.reset();
    setSkipped([]);
    setClashes([]);
  };

  const bookSeries = (skipDates: string[]) => {
    setSkipped(skipDates);
    const body = { resourceId: resource.id, startsAt, slots, weeks, skipDates };
    series.mutate(
      { body: { ...body, customerName, customerPhone: phone } },
      { onError: (error) => setClashes(error instanceof ApiError ? error.clashingDates : []) },
    );
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (repeat) return bookSeries(skipped);
    book.mutate({
      body: {
        resourceId: resource.id,
        startsAt,
        slots,
        walkIn: { customerName, customerPhone: phone, payment },
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
      <NumberField
        name="slots"
        className="w-40"
        minValue={1}
        maxValue={freeInARow}
        value={slots}
        onChange={(value) => changeSeries(() => on.onSlotsChange(Number.isNaN(value) ? 1 : value))}
      >
        <Label>{m.slotsLabel}</Label>
        <NumberField.Group>
          <NumberField.DecrementButton />
          <NumberField.Input className="tabular-nums" />
          <NumberField.IncrementButton />
        </NumberField.Group>
      </NumberField>
      <div className="grid">
        {canRepeat && (
          <Switch isSelected={repeat} onChange={(isOn) => changeSeries(() => setRepeat(isOn))}>
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              <Label>{m.repeatLabel}</Label>
            </Switch.Content>
          </Switch>
        )}
        <Collapse isOpen={repeat}>
          <div className="flex flex-wrap items-end gap-x-4 gap-y-2 pt-3">
            <NumberField
              name="weeks"
              className="w-40"
              minValue={MIN_SERIES_WEEKS}
              maxValue={MAX_SERIES_WEEKS}
              value={weeks}
              onChange={(value) =>
                changeSeries(() => setWeeks(Number.isNaN(value) ? MIN_SERIES_WEEKS : value))
              }
            >
              <Label>{m.weeksLabel}</Label>
              <NumberField.Group>
                <NumberField.DecrementButton />
                <NumberField.Input className="tabular-nums" />
                <NumberField.IncrementButton />
              </NumberField.Group>
            </NumberField>
            <span key={weeks} className="animate-tt-pop pb-2.5 text-sm text-muted tabular-nums">
              {m.weekRange(date, addDays(date, (weeks - 1) * DAYS_PER_WEEK))}
            </span>
          </div>
        </Collapse>
        <Collapse isOpen={!repeat}>
          <div
            className={`flex flex-wrap items-end justify-between gap-3 ${canRepeat ? "pt-5" : ""}`}
          >
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
            {price && (
              <p className="grid sm:justify-items-end">
                <span className="text-xs text-muted">{m.balance}</span>
                <span
                  key={`${payment}-${price.amount}`}
                  className="animate-tt-pop font-semibold tabular-nums"
                >
                  {formatMoney(payment === "CASH" ? { ...price, amount: 0 } : price)}
                </span>
              </p>
            )}
          </div>
        </Collapse>
      </div>
      {clashes.length > 0 ? (
        <SeriesClashes
          dates={clashes}
          weeks={weeks}
          skippedBefore={skipped.length}
          isSkipping={series.isPending}
          onSkip={() => bookSeries([...skipped, ...clashes])}
          onCancel={() => changeSeries(() => undefined)}
        />
      ) : (
        <>
          {refused && (
            <Alert status="danger" role="alert" className="animate-tt-rise">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>{refused.message}</Alert.Title>
              </Alert.Content>
            </Alert>
          )}
          <LoadingButton
            type="submit"
            icon={CalendarCheck}
            isPending={book.isPending || series.isPending}
            className="justify-self-start"
          >
            {repeat ? m.bookWeeks(weeks) : m.submit}
          </LoadingButton>
        </>
      )}
    </Form>
  );
}
