import {
  Button,
  Checkbox,
  CheckboxGroup,
  FieldError,
  Form,
  Input,
  Label,
  TextField,
} from "@heroui/react";
import { lkr } from "@turftap/ui";
import { type FormEvent, useState } from "react";

import { PriceField } from "../../components/PriceField";
import m from "../../i18n/en/prices";
import { useAddPriceRule } from "./useChangePriceRules";

const DEFAULT_START = "18:00";
const DEFAULT_END = "22:00";

export function AddPriceRuleForm({ resourceId }: { resourceId: number }) {
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
        <TextField type="time" isRequired value={startTime} onChange={setStartTime}>
          <Label>{m.startLabel}</Label>
          <Input />
          <FieldError />
        </TextField>
        <TextField
          type="time"
          isRequired
          value={endTime}
          onChange={setEndTime}
          validate={(end) => (end > startTime ? null : m.endBeforeStart)}
        >
          <Label>{m.endLabel}</Label>
          <Input />
          <FieldError />
        </TextField>
      </div>
      <PriceField label={m.rulePriceLabel} value={rupees} onChange={setRupees} />
      <Button type="submit" isPending={addRule.isPending}>
        {m.addRule}
      </Button>
    </Form>
  );
}
