import { FieldError, Input, TextField } from "@heroui/react";
import { Checkbox } from "react-aria-components";

import { PILL } from "../../components/Pills";
import m from "../../i18n/en/venues";
import type { DayHours } from "./useOpeningHours";

type Props = { days: DayHours[]; onChange: (weekday: number, fields: Partial<DayHours>) => void };

/** A week, one line a day: the day's pill turns it open or shut, then its hours. */
export function OpeningHoursFields({ days, onChange }: Props) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-sm font-medium">{m.hoursLabel}</legend>
      {days.map((day) => {
        const name = m.weekdays[day.weekday - 1]!;
        return (
          <div key={day.weekday} className="grid grid-cols-[4.5rem_1fr] items-start gap-3">
            <Checkbox
              aria-label={m.openOn(name)}
              isSelected={day.open}
              onChange={(open) => onChange(day.weekday, { open })}
              className={`${PILL} justify-center`}
            >
              {name.slice(0, 3)}
            </Checkbox>
            {day.open ? (
              <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
                <TextField
                  aria-label={m.opensOn(name)}
                  type="time"
                  isRequired
                  value={day.opens}
                  onChange={(opens) => onChange(day.weekday, { opens })}
                >
                  <Input className="tabular-nums" />
                  <FieldError />
                </TextField>
                <span aria-hidden className="pt-2 text-muted">
                  –
                </span>
                <TextField
                  aria-label={m.closesOn(name)}
                  type="time"
                  isRequired
                  value={day.closes}
                  onChange={(closes) => onChange(day.weekday, { closes })}
                  validate={(closes) => (closes > day.opens ? null : m.closesBeforeOpens)}
                >
                  <Input className="tabular-nums" />
                  <FieldError />
                </TextField>
              </div>
            ) : (
              <span className="pt-2 text-muted">{m.closedDay}</span>
            )}
          </div>
        );
      })}
    </fieldset>
  );
}
