import { Button, FieldError, Form, Input, Label, TextField } from "@heroui/react";
import { type FormEvent, useState } from "react";

import m from "../../i18n/en/closedDates";
import { useCloseDate } from "./useChangeClosedDates";
import { today } from "./useClosedDates";

export function CloseDateForm({ venueId }: { venueId: number }) {
  const closeDate = useCloseDate();
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    closeDate.mutate(
      { body: { venueId, date, reason: reason.trim() || null } },
      {
        onSuccess: () => {
          setDate("");
          setReason("");
        },
      },
    );
  };

  return (
    <Form className="grid gap-4" onSubmit={submit}>
      <h2 className="text-lg font-semibold">{m.addTitle}</h2>
      <TextField name="date" type="date" isRequired value={date} onChange={setDate}>
        <Label>{m.dateLabel}</Label>
        <Input min={today()} />
        <FieldError />
      </TextField>
      <TextField name="reason" value={reason} onChange={setReason}>
        <Label>{m.reasonLabel}</Label>
        <Input placeholder="Vesak Poya" />
      </TextField>
      <Button type="submit" isPending={closeDate.isPending}>
        {m.submit}
      </Button>
    </Form>
  );
}
