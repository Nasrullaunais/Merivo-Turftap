import { FieldError, Form, Input, Label, TextField } from "@heroui/react";
import { PhoneInput } from "@turftap/contract";
import { type FormEvent, useState } from "react";

import { LoadingButton } from "../../components/LoadingButton";
import m from "../../i18n/en/venues";
import { OpeningHoursFields } from "./OpeningHoursFields";
import { useAddVenue } from "./useAddVenue";
import { useOpeningHours } from "./useOpeningHours";

export function AddVenueForm() {
  const addVenue = useAddVenue();
  const hours = useOpeningHours();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = { name, address, phone, openingHours: hours.openingHours };
    addVenue.mutate(
      { body },
      {
        onSuccess: () => {
          setName("");
          setAddress("");
          setPhone("");
          hours.reset();
        },
      },
    );
  };

  return (
    <Form className="grid gap-4" onSubmit={submit}>
      <h2 className="text-lg font-semibold">{m.addTitle}</h2>
      <TextField name="name" isRequired value={name} onChange={setName}>
        <Label>{m.nameLabel}</Label>
        <Input />
        <FieldError />
      </TextField>
      <TextField name="address" isRequired value={address} onChange={setAddress}>
        <Label>{m.addressLabel}</Label>
        <Input />
        <FieldError />
      </TextField>
      <TextField
        name="phone"
        type="tel"
        isRequired
        value={phone}
        onChange={setPhone}
        validate={(value) => (PhoneInput.safeParse(value).success ? null : m.phoneInvalid)}
      >
        <Label>{m.phoneLabel}</Label>
        <Input placeholder="011 234 5678" />
        <FieldError />
      </TextField>
      <OpeningHoursFields days={hours.days} onChange={hours.change} />
      <LoadingButton type="submit" isPending={addVenue.isPending}>
        {m.submit}
      </LoadingButton>
      {addVenue.isSuccess && <p role="status">{m.added(addVenue.data.data.name)}</p>}
    </Form>
  );
}
