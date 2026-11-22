import { FieldError, Input, Label, TextField } from "@heroui/react";

import m from "../i18n/en/prices";

const WHOLE_RUPEES = /^[1-9]\d*$/;

type Props = { label: string; value: string; onChange: (rupees: string) => void };

/** A price in whole rupees above zero, as the API accepts it. */
export function PriceField({ label, value, onChange }: Props) {
  return (
    <TextField
      name="price"
      type="number"
      isRequired
      value={value}
      onChange={onChange}
      validate={(rupees) => (WHOLE_RUPEES.test(rupees) ? null : m.priceInvalid)}
    >
      <Label>{label}</Label>
      <Input min={1} step={1} />
      <FieldError />
    </TextField>
  );
}
