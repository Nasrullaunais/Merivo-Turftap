import { Checkbox, CheckboxGroup, FieldError, Form, Label, ListBox, Select } from "@heroui/react";
import { localTimeAt } from "@turftap/contract";
import { lkr } from "@turftap/ui";
import { type FormEvent, useState } from "react";

import { LoadingButton } from "../../components/LoadingButton";
import { PriceField } from "../../components/PriceField";
import m from "../../i18n/en/prices";
import { useAddPriceRule } from "./useChangePriceRules";
import { useStartInterval } from "./usePriceRules";

const DEFAULT_START = "18:00";
const DEFAULT_END = "22:00";
const MINUTES_PER_DAY = 24 * 60;

/** Every time on the Start Interval from `first` minute to `last` minute of the day. */
const timesEvery = (intervalMinutes: number, first: number, last: number) =>
  Array.from({ length: (last - first) / intervalMinutes + 1 }, (_, index) =>
    localTimeAt(first + index * intervalMinutes),
  );

export function AddPriceRuleForm({ resourceId }: { resourceId: number }) {
  const intervalMinutes = useStartInterval(resourceId);
  return intervalMinutes ? (
    <PriceRuleForm resourceId={resourceId} intervalMinutes={intervalMinutes} />
  ) : null;
}

function PriceRuleForm({
  resourceId,
  intervalMinutes,
}: {
  resourceId: number;
  intervalMinutes: number;
}) {
  const addRule = useAddPriceRule();
  const [weekdays, setWeekdays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState(DEFAULT_START);
  const [endTime, setEndTime] = useState(DEFAULT_END);
  const [rupees, setRupees] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    addRule.mutate(
      {
        body: {
          resourceId,
          weekdays: weekdays.map(Number).toSorted((a, b) => a - b),
          startTime,
          endTime,
          price: lkr(Number(rupees)),
        },
      },
      {
        onSuccess: () => {
          setWeekdays([]);
          setRupees("");
        },
      },
    );
  };

  return (
    <Form className="grid gap-4" onSubmit={submit}>
      <h2 className="text-lg font-semibold">{m.addRuleTitle}</h2>
      <CheckboxGroup
        name="weekdays"
        isRequired
        value={weekdays}
        onChange={setWeekdays}
        validate={(days) => (days.length > 0 ? null : m.weekdaysMissing)}
      >
        <Label>{m.weekdaysLabel}</Label>
        <div className="flex flex-wrap gap-4">
          {m.weekdays.map((name, index) => (
            <Checkbox key={name} value={String(index + 1)}>
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              <Checkbox.Content>
                <Label>{name}</Label>
              </Checkbox.Content>
            </Checkbox>
          ))}
        </div>
        <FieldError />
      </CheckboxGroup>
      <div className="grid grid-cols-2 gap-3">
        <TimeSelect
          label={m.startLabel}
          times={timesEvery(intervalMinutes, 0, MINUTES_PER_DAY - intervalMinutes)}
          value={startTime}
          onChange={setStartTime}
        />
        <TimeSelect
          label={m.endLabel}
          times={timesEvery(intervalMinutes, intervalMinutes, MINUTES_PER_DAY)}
          value={endTime}
          onChange={setEndTime}
          validate={(end) => (end > startTime ? null : m.endBeforeStart)}
        />
      </div>
      <PriceField label={m.rulePriceLabel} value={rupees} onChange={setRupees} />
      <LoadingButton type="submit" isPending={addRule.isPending}>
        {m.addRule}
      </LoadingButton>
    </Form>
  );
}

function TimeSelect({
  label,
  times,
  value,
  onChange,
  validate,
}: {
  label: string;
  times: string[];
  value: string;
  onChange: (time: string) => void;
  validate?: (time: string) => string | null;
}) {
  return (
    <Select
      isRequired
      value={value}
      onChange={(time) => onChange(String(time))}
      validate={validate && ((time) => validate(String(time)))}
    >
      <Label>{label}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <FieldError />
      <Select.Popover>
        <ListBox>
          {times.map((time) => (
            <ListBox.Item key={time} id={time} textValue={time}>
              {time}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
