import {
  Alert,
  Button,
  FieldError,
  Form,
  Label,
  Skeleton,
  TextArea,
  TextField,
} from "@heroui/react";
import { MAX_REJECT_REASON_LENGTH } from "@turftap/contract";
import type { Payment, ReceiptReading } from "@turftap/contract/client";
import { formatMoney } from "@turftap/ui";
import {
  CircleCheck,
  CircleX,
  ExternalLink,
  type LucideIcon,
  Phone,
  ReceiptText,
  TriangleAlert,
} from "lucide-react";
import { type FormEvent, useState } from "react";

import { BOOKING_ICONS, BOOKING_TONES } from "../../components/bookingLook";
import { Collapse } from "../../components/Collapse";
import type { Tone } from "../../components/look";
import { LoadingButton } from "../../components/LoadingButton";
import { TYPE_ICONS } from "../../components/resourceLook";
import { StatePill } from "../../components/StatePill";
import { TopicTile } from "../../components/TopicTile";
import bookings from "../../i18n/en/bookings";
import m from "../../i18n/en/receipts";
import { useReceiptBooking } from "./useReceiptChecks";

type Decision = "ACCEPTED" | "REJECTED";

type Props = {
  payment: Payment;
  /** Missing for staff who may only look. */
  onDecide?: (decision: Decision, rejectReason?: string) => void;
  deciding?: Decision;
  onOpenBooking?: (bookingId: number) => void;
};

/** PAY-03 to PAY-06: one receipt beside what the AI read from it, and the decision. */
export function ReceiptCheck({ payment, onDecide, deciding, onOpenBooking }: Props) {
  const reading = payment.receiptReading;
  return (
    <article aria-label={m.receipt} className="grid animate-tt-from-next gap-4">
      <BookingSummary bookingId={payment.bookingId} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <ReceiptFile url={payment.receiptUrl} />
        <div className="grid content-start gap-4">
          <Amounts payment={payment} reading={reading} />
          <Reading reading={reading} />
          {reading?.duplicateOf && (
            <Reused bookingId={reading.duplicateOf.bookingId} onOpenBooking={onOpenBooking} />
          )}
          {onDecide && <Decide onDecide={onDecide} deciding={deciding} />}
        </div>
      </div>
    </article>
  );
}

function BookingSummary({ bookingId }: { bookingId: number | null }) {
  const { booking, resource, venue } = useReceiptBooking(bookingId);
  if (!booking)
    return (
      <div role="status" aria-label={m.loading} className="grid gap-2 tt-panel p-4">
        <Skeleton className="h-7 w-48 rounded-lg" />
        <Skeleton className="h-4 w-72 rounded-lg" />
      </div>
    );
  return (
    <div className="flex flex-wrap items-center gap-4 tt-panel p-4">
      <div className="grid min-w-48 flex-1 gap-1">
        <h2 className="truncate text-2xl font-semibold tracking-tight">{booking.customerName}</h2>
        <span className="inline-flex items-center gap-1.5 text-sm text-muted tabular-nums">
          <Phone aria-hidden size={14} />
          {booking.customerPhone}
        </span>
      </div>
      {resource && venue && (
        <div className="flex items-center gap-3">
          <TopicTile
            hue="place"
            icon={TYPE_ICONS[resource.type]}
            size={40}
            className="rounded-xl"
          />
          <div className="grid">
            <span className="font-medium">{resource.name}</span>
            <span className="text-sm text-muted tabular-nums">
              {bookings.when(booking.startsAt, booking.endsAt, venue.timeZone)}
            </span>
          </div>
        </div>
      )}
      <StatePill
        key={booking.status}
        className="animate-tt-pop"
        tone={BOOKING_TONES[booking.status]}
        icon={BOOKING_ICONS[booking.status]}
        label={bookings.states[booking.status]}
      />
    </div>
  );
}

const isPdf = (url: string) => new URL(url).pathname.toLowerCase().endsWith(".pdf");

function ReceiptFile({ url }: { url: string | null }) {
  if (!url)
    return (
      <div className="grid min-h-80 place-items-center tt-panel p-6 text-muted">{m.noReceipt}</div>
    );
  return (
    <figure className="grid gap-2">
      <div className="grid min-h-80 place-items-center overflow-hidden tt-panel bg-[var(--tt-field)]">
        {isPdf(url) ? (
          <object
            data={url}
            type="application/pdf"
            aria-label={m.receipt}
            className="h-[36rem] w-full"
          >
            <a href={url} target="_blank" rel="noreferrer" className="text-accent underline">
              {m.openReceipt}
            </a>
          </object>
        ) : (
          <img src={url} alt={m.receipt} className="max-h-[36rem] w-full object-contain" />
        )}
      </div>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 justify-self-start rounded-md text-sm text-accent outline-none hover:underline focus-visible:ring-2 focus-visible:ring-focus"
      >
        <ExternalLink aria-hidden size={14} />
        {m.openReceipt}
      </a>
    </figure>
  );
}

function Amounts({ payment, reading }: { payment: Payment; reading: ReceiptReading | null }) {
  const read = reading?.amount ? formatMoney(reading.amount) : m.notRead;
  const amounts = [
    [m.amountDue, formatMoney(payment.amount)],
    [m.amountRead, read],
  ] as const;
  return (
    <dl className="grid grid-cols-2 gap-3 tt-panel p-4">
      {amounts.map(([label, value]) => (
        <div key={label} className="grid gap-0.5">
          <dt className="text-xs text-muted">{label}</dt>
          <dd className="text-xl font-semibold tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

const FLAG_TONE_WHEN_NO: Record<keyof typeof m.flags, Tone> = {
  amountMatches: "watch",
  dateRecent: "watch",
  referenceNew: "bad",
};

function Reading({ reading }: { reading: ReceiptReading | null }) {
  if (!reading)
    return (
      <div role="status" aria-label={m.stillReading} className="grid gap-3 tt-panel p-4">
        <p className="text-sm text-muted">{m.stillReading}</p>
        <Skeleton className="h-4 w-2/3 rounded-lg" />
        <Skeleton className="h-4 w-1/2 rounded-lg" />
      </div>
    );
  if (reading.unreadable)
    return (
      <Alert status="warning" className="animate-tt-rise">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>{m.unreadable}</Alert.Title>
        </Alert.Content>
      </Alert>
    );

  const details = [
    [m.paidOn, reading.paidOn && m.date(reading.paidOn)],
    [m.bank, reading.bank],
    [m.reference, reading.reference],
  ] as const;
  const flags = (Object.keys(m.flags) as (keyof typeof m.flags)[]).filter(
    (flag) => reading[flag] !== null,
  );
  return (
    <section aria-label={m.reading} className="grid gap-3 tt-panel p-4">
      <dl className="grid gap-2 text-sm">
        {details.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3">
            <dt className="text-muted">{label}</dt>
            <dd className="text-end font-medium tabular-nums">{value ?? m.notRead}</dd>
          </div>
        ))}
      </dl>
      {flags.length > 0 && (
        <ul className="flex flex-wrap gap-2 border-t border-[var(--tt-line)] pt-3">
          {flags.map((flag) => {
            const yes = reading[flag] === true;
            const look: [Tone, LucideIcon] = yes
              ? ["good", CircleCheck]
              : [FLAG_TONE_WHEN_NO[flag], TriangleAlert];
            return (
              <li key={flag}>
                <StatePill
                  tone={look[0]}
                  icon={look[1]}
                  label={m.flags[flag][yes ? "yes" : "no"]}
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

type ReusedProps = {
  bookingId: number | null;
  onOpenBooking: ((bookingId: number) => void) | undefined;
};

/** PAY-06: a warning only; staff decide. */
function Reused({ bookingId, onOpenBooking }: ReusedProps) {
  return (
    <Alert status="danger" className="animate-tt-rise">
      <Alert.Indicator />
      <Alert.Content className="grid gap-2">
        <Alert.Title>{m.reused}</Alert.Title>
        {bookingId !== null && onOpenBooking && (
          <Button
            size="sm"
            variant="danger-soft"
            className="justify-self-start"
            onPress={() => onOpenBooking(bookingId)}
          >
            <ReceiptText aria-hidden size={16} />
            {m.openEarlier}
          </Button>
        )}
      </Alert.Content>
    </Alert>
  );
}

type DecideProps = Required<Pick<Props, "onDecide">> & Pick<Props, "deciding">;

/** PAY-04, PAY-05: Accept at once; Reject unfolds a reason first, as the customer is sent it. */
function Decide({ onDecide, deciding }: DecideProps) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const busy = deciding !== undefined;

  const reject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onDecide("REJECTED", reason.trim());
  };

  return (
    <div className="grid tt-panel p-4">
      <div role="group" aria-label={m.decisions} className="flex flex-wrap gap-2">
        <LoadingButton
          icon={CircleCheck}
          className="tt-accept"
          isPending={deciding === "ACCEPTED"}
          isDisabled={busy && deciding !== "ACCEPTED"}
          onPress={() => onDecide("ACCEPTED")}
        >
          {m.accept}
        </LoadingButton>
        <Button
          variant={rejecting ? "danger" : "danger-soft"}
          aria-expanded={rejecting}
          isDisabled={busy}
          onPress={() => setRejecting((open) => !open)}
        >
          <CircleX aria-hidden size={16} />
          {m.reject}
        </Button>
      </div>
      <Collapse isOpen={rejecting}>
        <Form className="grid gap-4 pt-4" onSubmit={reject}>
          <TextField
            name="reason"
            isRequired
            maxLength={MAX_REJECT_REASON_LENGTH}
            value={reason}
            onChange={setReason}
          >
            <Label>{m.reasonLabel}</Label>
            <TextArea rows={2} />
            <FieldError />
          </TextField>
          <div className="flex flex-wrap items-center gap-3">
            <LoadingButton
              type="submit"
              variant="danger"
              icon={CircleX}
              isPending={deciding === "REJECTED"}
            >
              {m.rejectReceipt}
            </LoadingButton>
            <Button variant="tertiary" onPress={() => setRejecting(false)}>
              {m.keep}
            </Button>
            <span className="text-sm text-muted">{m.customerTold}</span>
          </div>
        </Form>
      </Collapse>
    </div>
  );
}
