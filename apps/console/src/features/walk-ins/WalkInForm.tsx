import {
  Alert,
  Description,
  FieldError,
  Form,
  Input,
  Label,
  NumberField,
  TextField,
} from "@heroui/react";
import { PhoneInput, WALK_IN_PAYMENTS, type WalkInPayment } from "@turftap/contract";
import type { Resource } from "@turftap/contract/client";
import { ApiError, formatMoney } from "@turftap/ui";
import { Banknote, CalendarCheck, Clock, UserCheck } from "lucide-react";
import { type FormEvent, useState } from "react";

import { LoadingButton } from "../../components/LoadingButton";
import { ChoicePills } from "../../components/Pills";
import { TYPE_ICONS } from "../../components/resourceLook";
import { SkeletonLine } from "../../components/SkeletonRows";
import { TopicTile } from "../../components/TopicTile";
import m from "../../i18n/en/walkIns";
import { onVenueClock } from "../../lib/time/venueClock";
import { useBookWalkIn, useCustomerByPhone, useSlotsFrom } from "./useWalkIn";

const MS_PER_MINUTE = 60_000;
// A wrong "paid in cash" records money nobody took; a wrong "pay later" only leaves a Balance.
const DEFAULT_PAYMENT: WalkInPayment = "PAY_LATER";
const PAYMENT_ICONS = { CASH: Banknote, PAY_LATER: Clock };

type Props = { resource: Resource; startsAt: string; timeZone: string; onBooked: () => void };

/** BKG-04: Front Desk books a free slot for someone at the desk or on the phone. */
export function WalkInForm({ resource, startsAt, timeZone, onBooked }: Props) {
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
  onBooked: () => void;
};

function WalkInFields({ resource, startsAt, date, slots, freeInARow, price, ...on }: FieldsProps) {
  const book = useBookWalkIn(resource.id, date, on.onBooked);
  const [phone, setPhone] = useState("");
  const [typedName, setTypedName] = useState("");
  const [payment, setPayment] = useState<WalkInPayment>(DEFAULT_PAYMENT);
  const { data: customer } = useCustomerByPhone(phone);
  const refused = book.error instanceof ApiError ? book.error : undefined;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const customerName = customer?.name ?? typedName.trim();
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
        onChange={(value) => on.onSlotsChange(Number.isNaN(value) ? 1 : value)}
      >
        <Label>{m.slotsLabel}</Label>
        <NumberField.Group>
          <NumberField.DecrementButton />
          <NumberField.Input className="tabular-nums" />
          <NumberField.IncrementButton />
        </NumberField.Group>
      </NumberField>
      <div className="flex flex-wrap items-end justify-between gap-3">
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
        isPending={book.isPending}
        className="justify-self-start"
      >
        {m.submit}
      </LoadingButton>
    </Form>
  );
}
