import { FieldError, Form, Input, Label, TextField } from "@heroui/react";
import {
  DEFAULT_START_INTERVAL_MINUTES,
  RESOURCE_MINUTES,
  RESOURCE_TYPES,
  type ResourceType,
} from "@turftap/contract";
import { lkr } from "@turftap/ui";
import { type FormEvent, useState } from "react";

import { LoadingButton } from "../../components/LoadingButton";
import { ChoicePills } from "../../components/Pills";
import { PriceField } from "../../components/PriceField";
import m from "../../i18n/en/resources";
import { TYPE_ICONS } from "../../components/resourceLook";
import { useAddResource } from "./useChangeResources";

const DEFAULT_TYPE: ResourceType = "FUTSAL_COURT";
type Minutes = (typeof RESOURCE_MINUTES)[number];
const DEFAULT_SLOT_MINUTES: Minutes = 60;

/** VEN-04. `onAdded` folds the form away; the new resource lands in the list above it. */
export function AddResourceForm({ venueId, onAdded }: { venueId: number; onAdded: () => void }) {
  const addResource = useAddResource();
  const [name, setName] = useState("");
  const [type, setType] = useState<ResourceType>(DEFAULT_TYPE);
  const [slotMinutes, setSlotMinutes] = useState<Minutes>(DEFAULT_SLOT_MINUTES);
  const [startIntervalMinutes, setStartIntervalMinutes] = useState<Minutes>(
    DEFAULT_START_INTERVAL_MINUTES,
  );
  const [rupees, setRupees] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    addResource.mutate(
      {
        body: {
          venueId,
          name,
          type,
          slotMinutes,
          startIntervalMinutes,
          price: lkr(Number(rupees)),
        },
      },
      {
        onSuccess: () => {
          setName("");
          setRupees("");
          onAdded();
        },
      },
    );
  };

  return (
    <Form className="grid gap-5" onSubmit={submit}>
      <TextField name="name" isRequired value={name} onChange={setName}>
        <Label>{m.nameLabel}</Label>
        <Input placeholder="Court 1" />
        <FieldError />
      </TextField>
      <ChoicePills
        name="type"
        label={m.typeLabel}
        value={type}
        onChange={setType}
        choices={RESOURCE_TYPES.map((value) => ({
          value,
          label: m.types[value],
          icon: TYPE_ICONS[value],
        }))}
      />
      <MinutesChoice
        name="slotMinutes"
        label={m.slotLabel}
        value={slotMinutes}
        onChange={(minutes) => {
          setSlotMinutes(minutes);
          setStartIntervalMinutes((interval) => Math.min(interval, minutes) as Minutes);
        }}
      />
      <MinutesChoice
        name="startIntervalMinutes"
        label={m.intervalLabel}
        description={m.intervalHint}
        value={startIntervalMinutes}
        onChange={setStartIntervalMinutes}
        longest={slotMinutes}
      />
      <div className="sm:w-64">
        <PriceField label={m.priceLabel} value={rupees} onChange={setRupees} />
      </div>
      <LoadingButton type="submit" isPending={addResource.isPending} className="justify-self-start">
        {m.submit}
      </LoadingButton>
    </Form>
  );
}

function MinutesChoice({
  name,
  label,
  description,
  value,
  onChange,
  longest,
}: {
  name: string;
  label: string;
  description?: string;
  value: Minutes;
  onChange: (minutes: Minutes) => void;
  longest?: Minutes;
}) {
  return (
    <ChoicePills
      name={name}
      label={label}
      description={description}
      value={String(value)}
      onChange={(picked) => onChange(Number(picked) as Minutes)}
      choices={RESOURCE_MINUTES.map((minutes) => ({
        value: String(minutes),
        label: m.minutes(minutes),
        isDisabled: longest !== undefined && minutes > longest,
      }))}
    />
  );
}
