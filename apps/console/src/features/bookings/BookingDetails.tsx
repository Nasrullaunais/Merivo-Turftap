import { Alert, Button, FieldError, Form, Input, Label, TextArea, TextField } from "@heroui/react";
import {
  HOLDING_STATUSES,
  MAX_CANCEL_REASON_LENGTH,
  type MyTenant,
  REFUND_ROLES,
} from "@turftap/contract";
import type { Booking, Payment, Resource } from "@turftap/contract/client";
import { ApiError, formatMoney, lkr, rupeesOf } from "@turftap/ui";
import {
  Banknote,
  CalendarX,
  CircleCheck,
  CircleX,
  Phone,
  ReceiptText,
  Repeat,
  Undo2,
  type LucideIcon,
  ScanSearch,
} from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";

import { BOOKING_ICONS, BOOKING_TONES } from "../../components/bookingLook";
import { Collapse } from "../../components/Collapse";
import { TONE_CLASS, type Tone } from "../../components/look";
import { LoadingButton } from "../../components/LoadingButton";
import { PriceField } from "../../components/PriceField";
import { Row, Rows } from "../../components/Rows";
import { EmptyLine } from "../../components/Section";
import { SkeletonRows } from "../../components/SkeletonRows";
import { StateDot, StatePill } from "../../components/StatePill";
import { TYPE_ICONS } from "../../components/resourceLook";
import { TopicTile } from "../../components/TopicTile";
import { usePresence } from "../../components/usePresence";
import m from "../../i18n/en/bookings";
import { can } from "../../lib/tenant/activeTenant";
import {
  useBooking,
  useCancelBooking,
  useCancelSeries,
  usePayments,
  useRecordPayment,
  useSeries,
} from "./useBooking";

const KIND_ICONS: Record<Payment["kind"], LucideIcon> = {
  TRANSFER: ReceiptText,
  CASH: Banknote,
  REFUND: Undo2,
};
const PAYMENT_LOOK: Record<Payment["status"], { tone: Tone; icon: LucideIcon }> = {
  PENDING_CHECK: { tone: "busy", icon: ScanSearch },
  ACCEPTED: { tone: "good", icon: CircleCheck },
  REJECTED: { tone: "bad", icon: CircleX },
};

type Action = "cash" | "refund" | "cancel" | "series";

type Props = {
  booking: Booking;
  resource: Resource;
  timeZone: string;
  tenant: MyTenant | undefined;
};

/** BKG-07, PAY-08, BKG-08, BKG-09: one booking's state and money, and what staff can do with it. */
export function BookingDetails({ booking: pressed, resource, timeZone, tenant }: Props) {
  const { data: booking = pressed } = useBooking(pressed);
  const { data: series } = useSeries(booking.repeatSeriesId);
  const [action, setAction] = useState<Action>();
  const actions: Record<Action, boolean> = {
    cash:
      can(tenant, "payments:create") &&
      booking.status === "CONFIRMED" &&
      booking.balance.amount > 0,
    refund:
      tenant !== undefined &&
      REFUND_ROLES.includes(tenant.role) &&
      booking.status === "CANCELLED" &&
      booking.paid.amount > 0,
    cancel:
      can(tenant, "bookings:update") &&
      (HOLDING_STATUSES as readonly string[]).includes(booking.status),
    series: can(tenant, "repeat-series:update") && series?.status === "ACTIVE",
  };
  const shownAction = action && actions[action] ? action : undefined;
  const toggle = (pressedAction: Action) =>
    setAction((open) => (open === pressedAction ? undefined : pressedAction));
  const done = () => setAction(undefined);

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 rounded-2xl border border-[var(--tt-line)] p-3">
        <div className="flex items-center gap-3">
          <TopicTile
            hue="place"
            icon={TYPE_ICONS[resource.type]}
            size={40}
            className="rounded-xl"
          />
          <div className="grid min-w-0 flex-1">
            <span className="truncate font-semibold">{resource.name}</span>
            <span className="text-sm text-muted tabular-nums">
              {m.when(booking.startsAt, booking.endsAt, timeZone)}
            </span>
          </div>
          <StatePill
            key={booking.status}
            className="animate-tt-pop"
            tone={BOOKING_TONES[booking.status]}
            icon={BOOKING_ICONS[booking.status]}
            label={m.states[booking.status]}
          />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <Phone aria-hidden size={14} />
            {booking.customerPhone}
          </span>
          <span>{m.sources[booking.source]}</span>
          {booking.repeatSeriesId !== null && (
            <span className="inline-flex items-center gap-1.5 tabular-nums">
              <Repeat aria-hidden size={14} />
              {series ? m.seriesLine(series.weeks, series.firstDate) : m.weekly}
            </span>
          )}
          {series?.status === "CANCELLED" && (
            <span className="animate-tt-pop">
              <StateDot tone="off" label={m.seriesCancelled} />
            </span>
          )}
        </div>
        <MoneyLine booking={booking} />
      </div>
      {booking.cancelReason && (
        <p className="grid gap-0.5 animate-tt-rise text-sm">
          <span className="text-xs text-muted">{m.cancelReason}</span>
          {booking.cancelReason}
        </p>
      )}
      <section aria-label={m.payments} className="grid gap-2">
        <h3 className="text-sm font-semibold">{m.payments}</h3>
        <div className="overflow-hidden rounded-xl border border-[var(--tt-line)]">
          <PaymentRows bookingId={booking.id} timeZone={timeZone} />
        </div>
      </section>
      {Object.values(actions).some(Boolean) && (
        <div className="grid">
          <div role="group" aria-label={m.actions} className="flex flex-wrap gap-2">
            {actions.cash && (
              <ActionButton action="cash" open={shownAction} onPress={toggle} icon={Banknote}>
                {m.recordCash}
              </ActionButton>
            )}
            {actions.refund && (
              <ActionButton action="refund" open={shownAction} onPress={toggle} icon={Undo2}>
                {m.recordRefund}
              </ActionButton>
            )}
            {actions.cancel && (
              <ActionButton action="cancel" open={shownAction} onPress={toggle} icon={CircleX}>
                {m.cancel}
              </ActionButton>
            )}
            {actions.series && (
              <ActionButton action="series" open={shownAction} onPress={toggle} icon={CalendarX}>
                {m.cancelSeries}
              </ActionButton>
            )}
          </div>
          <div>
            <Collapse isOpen={shownAction === "cash"}>
              <CashForm key={booking.balance.amount} booking={booking} onDone={done} />
            </Collapse>
            <Collapse isOpen={shownAction === "refund"}>
              <RefundForm key={booking.paid.amount} booking={booking} onDone={done} />
            </Collapse>
            <Collapse isOpen={shownAction === "cancel"}>
              <CancelForm booking={booking} onDone={done} />
            </Collapse>
            {booking.repeatSeriesId !== null && (
              <Collapse isOpen={shownAction === "series"}>
                <CancelSeriesForm
                  seriesId={booking.repeatSeriesId}
                  booking={booking}
                  onDone={done}
                />
              </Collapse>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MoneyLine({ booking }: { booking: Booking }) {
  const balanceTone = booking.balance.amount > 0 ? `${TONE_CLASS.watch} tt-tone-text` : "";
  const amounts = [
    [m.price, booking.price, ""],
    [m.paid, booking.paid, ""],
    [m.balance, booking.balance, balanceTone],
  ] as const;
  return (
    <dl className="grid grid-cols-3 gap-2 border-t border-[var(--tt-line)] pt-3">
      {amounts.map(([label, money, tone]) => (
        <div key={label} className="grid gap-0.5">
          <dt className="text-xs text-muted">{label}</dt>
          <dd
            key={money.amount}
            className={`animate-tt-pop text-lg font-semibold tabular-nums ${tone}`}
          >
            {formatMoney(money)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function PaymentRows({ bookingId, timeZone }: { bookingId: number; timeZone: string }) {
  const { data: payments, isPending } = usePayments(bookingId);
  const shown = usePresence(payments ?? [], (payment) => payment.id);

  if (isPending)
    return (
      <div className="p-2">
        <SkeletonRows label={m.loadingPayments} rows={1} />
      </div>
    );
  if (!payments?.length) return <EmptyLine>{m.noPayments}</EmptyLine>;
  return (
    <Rows label={m.payments}>
      {shown.map(({ item: payment, isNew, isLeaving }, index) => (
        <Row
          key={payment.id}
          index={index}
          landed={isNew}
          leaving={isLeaving}
          lead={<TopicTile hue="money" icon={KIND_ICONS[payment.kind]} />}
          title={m.kinds[payment.kind]}
          detail={
            <>
              <span className="tabular-nums">{m.at(payment.createdAt, timeZone)}</span>
              {payment.note && <span>{payment.note}</span>}
            </>
          }
          end={
            <span className="grid justify-items-end gap-0.5">
              <span className="font-semibold tabular-nums">{formatMoney(payment.amount)}</span>
              <StateDot
                tone={PAYMENT_LOOK[payment.status].tone}
                label={m.paymentStates[payment.status]}
              />
            </span>
          }
        />
      ))}
    </Rows>
  );
}

type ActionButtonProps = {
  action: Action;
  open: Action | undefined;
  onPress: (action: Action) => void;
  icon: LucideIcon;
  children: ReactNode;
};

function ActionButton({ action, open, onPress, icon: Icon, children }: ActionButtonProps) {
  const isOpen = open === action;
  const isDanger = action === "cancel" || action === "series";
  const variant = isDanger ? "danger-soft" : isOpen ? "primary" : "secondary";
  return (
    <Button variant={variant} aria-expanded={isOpen} onPress={() => onPress(action)}>
      <Icon aria-hidden size={16} />
      {children}
    </Button>
  );
}

type FormProps = { booking: Booking; onDone: () => void };

/** PAY-08: any amount up to the Balance; it starts as the whole Balance. */
function CashForm({ booking, onDone }: FormProps) {
  const record = useRecordPayment(booking.id, onDone);
  const [rupees, setRupees] = useState(String(rupeesOf(booking.balance)));

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = { ...lkr(Number(rupees)), currency: booking.balance.currency };
    record.mutate({ body: { bookingId: booking.id, kind: "CASH", amount, note: null } });
  };

  return (
    <Form className="grid gap-4 pt-4" onSubmit={submit}>
      <div className="w-48">
        <PriceField label={m.amountLabel} value={rupees} onChange={setRupees} />
      </div>
      <Refused error={record.error} />
      <LoadingButton
        type="submit"
        icon={Banknote}
        isPending={record.isPending}
        className="justify-self-start"
      >
        {m.recordCash}
      </LoadingButton>
    </Form>
  );
}

/** BKG-08: up to what was paid, with a note on how it was paid back. */
function RefundForm({ booking, onDone }: FormProps) {
  const record = useRecordPayment(booking.id, onDone);
  const [rupees, setRupees] = useState(String(rupeesOf(booking.paid)));
  const [note, setNote] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = { ...lkr(Number(rupees)), currency: booking.paid.currency };
    record.mutate({ body: { bookingId: booking.id, kind: "REFUND", amount, note: note.trim() } });
  };

  return (
    <Form className="grid gap-4 pt-4" onSubmit={submit}>
      <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
        <PriceField label={m.amountLabel} value={rupees} onChange={setRupees} />
        <TextField name="note" isRequired value={note} onChange={setNote}>
          <Label>{m.noteLabel}</Label>
          <Input />
          <FieldError />
        </TextField>
      </div>
      <Refused error={record.error} />
      <LoadingButton
        type="submit"
        icon={Undo2}
        isPending={record.isPending}
        className="justify-self-start"
      >
        {m.recordRefund}
      </LoadingButton>
    </Form>
  );
}

/** BKG-07: staff always give a reason, and the customer is sent it. */
function CancelForm({ booking, onDone }: FormProps) {
  const cancel = useCancelBooking(booking.id, onDone);
  return (
    <ReasonForm
      submitLabel={m.cancel}
      mutation={cancel}
      onSubmit={(cancelReason) =>
        cancel.mutate({ path: { id: booking.id }, body: { status: "CANCELLED", cancelReason } })
      }
      onKeep={onDone}
    />
  );
}

/** BKG-09: the series's bookings that haven't started are cancelled; past ones stay. */
function CancelSeriesForm({ seriesId, booking, onDone }: FormProps & { seriesId: number }) {
  const cancel = useCancelSeries(seriesId, booking.id, onDone);
  return (
    <ReasonForm
      submitLabel={m.cancelSeries}
      mutation={cancel}
      onSubmit={(cancelReason) =>
        cancel.mutate({ path: { id: seriesId }, body: { status: "CANCELLED", cancelReason } })
      }
      onKeep={onDone}
    />
  );
}

type ReasonFormProps = {
  submitLabel: string;
  mutation: { isPending: boolean; error: unknown };
  onSubmit: (reason: string) => void;
  onKeep: () => void;
};

function ReasonForm({ submitLabel, mutation, onSubmit, onKeep }: ReasonFormProps) {
  const [reason, setReason] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(reason.trim());
  };

  return (
    <Form className="grid gap-4 pt-4" onSubmit={submit}>
      <TextField
        name="reason"
        isRequired
        maxLength={MAX_CANCEL_REASON_LENGTH}
        value={reason}
        onChange={setReason}
      >
        <Label>{m.reasonLabel}</Label>
        <TextArea rows={2} />
        <FieldError />
      </TextField>
      <Refused error={mutation.error} />
      <div className="flex flex-wrap items-center gap-3">
        <LoadingButton type="submit" variant="danger" icon={CircleX} isPending={mutation.isPending}>
          {submitLabel}
        </LoadingButton>
        <Button variant="tertiary" onPress={onKeep}>
          {m.keep}
        </Button>
        <span className="text-sm text-muted">{m.customerTold}</span>
      </div>
    </Form>
  );
}

function Refused({ error }: { error: unknown }) {
  if (!(error instanceof ApiError)) return null;
  return (
    <Alert status="danger" role="alert" className="animate-tt-rise">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{error.message}</Alert.Title>
      </Alert.Content>
    </Alert>
  );
}
