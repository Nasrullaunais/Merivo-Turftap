import { FieldError, Form, Input, Label, TextField } from "@heroui/react";
import { PhoneInput } from "@turftap/contract";
import { type FormEvent, useState } from "react";

import { LoadingButton } from "../../components/LoadingButton";
import m from "../../i18n/en/venues";
import { OpeningHoursFields } from "./OpeningHoursFields";
import { useAddVenue } from "./useAddVenue";
import { useOpeningHours } from "./useOpeningHours";

/** VEN-01. `onAdded` folds the form away; the new venue lands in the list above it. */
export function AddVenueForm({ onAdded }: { onAdded: () => void }) {
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
          onAdded();
        },
      },
    );
  };

  return (
    <Form className="grid gap-5" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="name" isRequired value={name} onChange={setName}>
          <Label>{m.nameLabel}</Label>
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
        <TextField
          name="address"
          isRequired
          value={address}
          onChange={setAddress}
          className="sm:col-span-2"
        >
          <Label>{m.addressLabel}</Label>
          <Input />
          <FieldError />
        </TextField>
      </div>
      <OpeningHoursFields days={hours.days} onChange={hours.change} />
      <LoadingButton type="submit" isPending={addVenue.isPending} className="justify-self-start">
        {m.submit}
      </LoadingButton>
    </Form>
  );
}
