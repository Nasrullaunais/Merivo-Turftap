import { Alert, Button, FieldError, Form, Input, Label, TextField } from "@heroui/react";
import { type FormEvent, useState } from "react";

import { LoadingButton } from "../../components/LoadingButton";
import m from "../../i18n/en/closedDates";
import { type AffectedBooking, useCloseDate } from "./useChangeClosedDates";
import { today, useResourceNames, useVenueTimeZone } from "./useClosedDates";

type Props = { venueId: number; onClosed: () => void };

/** VEN-02. `onClosed` folds the form away; the date lands in the list above it. */
export function CloseDateForm({ venueId, onClosed }: Props) {
  const timeZone = useVenueTimeZone(venueId);
  return timeZone ? <CloseForm venueId={venueId} timeZone={timeZone} onClosed={onClosed} /> : null;
}

function CloseForm({ venueId, timeZone, onClosed }: Props & { timeZone: string }) {
  const closeDate = useCloseDate();
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [affected, setAffected] = useState<AffectedBooking[]>([]);

  const close = (confirmed: boolean) =>
    closeDate.mutate(
      { venueId, date, reason: reason.trim() || null, timeZone, confirmed },
      {
        onSuccess: (result) => {
          setAffected(result.affected);
          if (!result.closed) return;
          setDate("");
          setReason("");
          onClosed();
        },
      },
    );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    close(false);
  };

  const edit = (set: (value: string) => void) => (value: string) => {
    set(value);
    setAffected([]);
  };

  return (
    <Form className="grid gap-5" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
        <TextField name="date" type="date" isRequired value={date} onChange={edit(setDate)}>
          <Label>{m.dateLabel}</Label>
          <Input min={today()} />
          <FieldError />
        </TextField>
        <TextField name="reason" value={reason} onChange={edit(setReason)}>
          <Label>{m.reasonLabel}</Label>
          <Input placeholder="Vesak Poya" />
        </TextField>
      </div>
      {affected.length > 0 ? (
        <AffectedBookings
          venueId={venueId}
          date={date}
          timeZone={timeZone}
          bookings={affected}
          isClosing={closeDate.isPending}
          onConfirm={() => close(true)}
          onBack={() => setAffected([])}
        />
      ) : (
        <LoadingButton type="submit" isPending={closeDate.isPending} className="justify-self-start">
          {m.submit}
        </LoadingButton>
      )}
    </Form>
  );
}

type AffectedBookingsProps = {
  venueId: number;
  date: string;
  timeZone: string;
  bookings: AffectedBooking[];
  isClosing: boolean;
  onConfirm: () => void;
  onBack: () => void;
};

function AffectedBookings(props: AffectedBookingsProps) {
  const resourceNames = useResourceNames(props.venueId);
  return (
    <Alert status="warning">
      <Alert.Indicator />
      <Alert.Content className="grid gap-3">
        <Alert.Title>{m.affectedTitle(props.bookings.length, m.day(props.date))}</Alert.Title>
        <Alert.Description>{m.affectedHint}</Alert.Description>
        <ul className="grid divide-y divide-separator" aria-label={m.affectedListLabel}>
          {props.bookings.map((booking) => (
            <li key={booking.id} className="flex flex-wrap gap-x-3 py-2">
              <span className="font-medium">
                {m.bookingTime(booking.startsAt, booking.endsAt, props.timeZone)}
              </span>
              <span>{resourceNames?.get(booking.resourceId)}</span>
              <span>{booking.customerName}</span>
              <a className="underline" href={`tel:${booking.customerPhone}`}>
                {booking.customerPhone}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <LoadingButton variant="danger" isPending={props.isClosing} onPress={props.onConfirm}>
            {m.closeAnyway}
          </LoadingButton>
          <Button variant="secondary" onPress={props.onBack}>
            {m.goBack}
          </Button>
        </div>
      </Alert.Content>
    </Alert>
  );
}
