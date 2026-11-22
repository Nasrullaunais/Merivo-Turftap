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
import { CreateResource, RESOURCE_TYPES, type ResourceType } from "@turftap/contract";
import { lkr } from "@turftap/ui";
import { type FormEvent, useState } from "react";

import { PriceField } from "../../components/PriceField";
import m from "../../i18n/en/resources";
import { useAddResource } from "./useChangeResources";

const DEFAULT_TYPE: ResourceType = "FUTSAL_COURT";
const DEFAULT_SLOT_MINUTES = "60";
const isSlotLength = (value: string) =>
  CreateResource.shape.slotMinutes.safeParse(Number(value)).success;

export function AddResourceForm({ venueId }: { venueId: number }) {
  const addResource = useAddResource();
  const [name, setName] = useState("");
  const [type, setType] = useState<ResourceType>(DEFAULT_TYPE);
  const [slotMinutes, setSlotMinutes] = useState(DEFAULT_SLOT_MINUTES);
  const [rupees, setRupees] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    addResource.mutate(
      {
        body: { venueId, name, type, slotMinutes: Number(slotMinutes), price: lkr(Number(rupees)) },
      },
      {
        onSuccess: () => {
          setName("");
          setRupees("");
        },
      },
    );
  };

  return (
    <Form className="grid gap-4" onSubmit={submit}>
      <h2 className="text-lg font-semibold">{m.addTitle}</h2>
      <TextField name="name" isRequired value={name} onChange={setName}>
        <Label>{m.nameLabel}</Label>
        <Input placeholder="Court 1" />
        <FieldError />
      </TextField>
      <RadioGroup
        name="type"
        orientation="horizontal"
        value={type}
        onChange={(value) => setType(value as ResourceType)}
      >
        <Label>{m.typeLabel}</Label>
        {RESOURCE_TYPES.map((value) => (
          <Radio key={value} value={value}>
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
            <Radio.Content>
              <Label>{m.types[value]}</Label>
            </Radio.Content>
          </Radio>
        ))}
      </RadioGroup>
      <TextField
        name="slotMinutes"
        type="number"
        isRequired
        value={slotMinutes}
        onChange={setSlotMinutes}
        validate={(value) => (isSlotLength(value) ? null : m.slotInvalid)}
      >
        <Label>{m.slotLabel}</Label>
        <Input />
        <FieldError />
      </TextField>
      <PriceField label={m.priceLabel} value={rupees} onChange={setRupees} />
      <Button type="submit" isPending={addResource.isPending}>
        {m.submit}
      </Button>
    </Form>
  );
}
