import {
  Button,
  FieldError,
  Form,
  Input,
  Label,
  Radio,
  RadioGroup,
  TextField,
} from "@heroui/react";
import { PhoneInput, STAFF_ROLES, type StaffRole } from "@turftap/contract";
import { type FormEvent, useState } from "react";

import m from "../../i18n/en/staff";
import tenants from "../../i18n/en/tenants";
import { useAddStaff } from "./useAddStaff";

const DEFAULT_ROLE: StaffRole = "FRONT_DESK";

export function AddStaffForm() {
  const addStaff = useAddStaff();
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<StaffRole>(DEFAULT_ROLE);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    addStaff.mutate({ body: { phone, role } }, { onSuccess: () => setPhone("") });
  };

  return (
    <Form className="grid gap-4" onSubmit={submit}>
      <h2 className="text-lg font-semibold">{m.addTitle}</h2>
      <TextField
        name="phone"
        type="tel"
        isRequired
        value={phone}
        onChange={setPhone}
        validate={(value) => (PhoneInput.safeParse(value).success ? null : m.phoneInvalid)}
      >
        <Label>{m.phoneLabel}</Label>
        <Input placeholder="077 123 4567" />
        <FieldError />
      </TextField>
      <RadioGroup
        name="role"
        orientation="horizontal"
        value={role}
        onChange={(value) => setRole(value as StaffRole)}
      >
        <Label>{m.roleLabel}</Label>
        {STAFF_ROLES.map((value) => (
          <Radio key={value} value={value}>
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
            <Radio.Content>
              <Label>{tenants.roles[value]}</Label>
            </Radio.Content>
          </Radio>
        ))}
      </RadioGroup>
      <Button type="submit" isPending={addStaff.isPending}>
        {m.submit}
      </Button>
      {addStaff.isSuccess && <p role="status">{m.added(addStaff.data.data.phone)}</p>}
    </Form>
  );
}
