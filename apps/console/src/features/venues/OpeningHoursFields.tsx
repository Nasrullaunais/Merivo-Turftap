import { Checkbox, FieldError, Input, Label, TextField } from "@heroui/react";

import m from "../../i18n/en/venues";
import type { DayHours } from "./useOpeningHours";

type Props = { days: DayHours[]; onChange: (weekday: number, fields: Partial<DayHours>) => void };

export function OpeningHoursFields({ days, onChange }: Props) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-sm font-medium">{m.hoursLabel}</legend>
      {days.map((day) => {
        const name = m.weekdays[day.weekday - 1]!;
        return (
          <div key={day.weekday} className="grid grid-cols-[8rem_1fr_1fr] items-start gap-3">
            <Checkbox
              aria-label={m.openOn(name)}
              isSelected={day.open}
              onChange={(open) => onChange(day.weekday, { open })}
            >
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              <Checkbox.Content>
                <Label>{name}</Label>
              </Checkbox.Content>
            </Checkbox>
            {day.open && (
              <>
                <TextField
                  aria-label={m.opensOn(name)}
                  type="time"
                  isRequired
                  value={day.opens}
                  onChange={(opens) => onChange(day.weekday, { opens })}
                >
                  <Input />
                  <FieldError />
                </TextField>
                <TextField
                  aria-label={m.closesOn(name)}
                  type="time"
                  isRequired
                  value={day.closes}
                  onChange={(closes) => onChange(day.weekday, { closes })}
                  validate={(closes) => (closes > day.opens ? null : m.closesBeforeOpens)}
                >
                  <Input />
                  <FieldError />
                </TextField>
              </>
            )}
          </div>
        );
      })}
    </fieldset>
  );
}
