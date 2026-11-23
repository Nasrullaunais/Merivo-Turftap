import { Alert, Button, FieldError, Form, Input, Label, TextField } from "@heroui/react";
import { ApiError, instantInZone } from "@turftap/ui";
import { type FormEvent, useState } from "react";

import m from "../../i18n/en/blockedTimes";
import { useVenueTimeZone } from "./useBlockedTimes";
import { useBlockTime } from "./useChangeBlockedTimes";

export function BlockResourceForm({ resourceId }: { resourceId: number }) {
  const timeZone = useVenueTimeZone(resourceId);
  return timeZone ? <BlockForm resourceId={resourceId} timeZone={timeZone} /> : null;
}

function BlockForm({ resourceId, timeZone }: { resourceId: number; timeZone: string }) {
  const blockTime = useBlockTime();
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");
  const startsAt = () => instantInZone(startDate, startTime, timeZone);
  const endsAt = () => instantInZone(endDate || startDate, endTime, timeZone);
  const refused = blockTime.error instanceof ApiError ? blockTime.error : undefined;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    blockTime.mutate(
      {
        body: {
          resourceId,
          startsAt: startsAt().toISOString(),
          endsAt: endsAt().toISOString(),
          reason: reason.trim() || null,
        },
      },
      {
        onSuccess: () => {
          setStartTime("");
          setEndTime("");
          setReason("");
        },
      },
    );
  };

  return (
    <Form className="grid gap-4" onSubmit={submit}>
      <h2 className="text-lg font-semibold">{m.addTitle}</h2>
      <p className="text-muted">{m.addHint(timeZone)}</p>
      <div className="grid grid-cols-2 gap-3">
        <TextField
          name="startDate"
          type="date"
          isRequired
          value={startDate}
          onChange={(value) => {
            setStartDate(value);
            if (!endDate || endDate < value) setEndDate(value);
          }}
        >
          <Label>{m.startDateLabel}</Label>
          <Input />
          <FieldError />
        </TextField>
        <TextField
          name="startTime"
          type="time"
          isRequired
          value={startTime}
          onChange={setStartTime}
        >
          <Label>{m.startTimeLabel}</Label>
          <Input />
          <FieldError />
        </TextField>
        <TextField name="endDate" type="date" isRequired value={endDate} onChange={setEndDate}>
          <Label>{m.endDateLabel}</Label>
          <Input min={startDate} />
          <FieldError />
        </TextField>
        <TextField
          name="endTime"
          type="time"
          isRequired
          value={endTime}
          onChange={setEndTime}
          validate={() =>
            startDate && startTime && endTime && endsAt() <= startsAt() ? m.endBeforeStart : null
          }
        >
          <Label>{m.endTimeLabel}</Label>
          <Input />
          <FieldError />
        </TextField>
      </div>
      <TextField name="reason" value={reason} onChange={setReason}>
        <Label>{m.reasonLabel}</Label>
        <Input placeholder="Repainting" />
      </TextField>
      {refused && (
        <Alert status="danger" role="alert">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{refused.message}</Alert.Title>
            {refused.fieldErrors.map(({ field, message }) => (
              <Alert.Description key={field}>{message}</Alert.Description>
            ))}
          </Alert.Content>
        </Alert>
      )}
      <Button type="submit" isPending={blockTime.isPending}>
        {m.submit}
      </Button>
    </Form>
  );
}
