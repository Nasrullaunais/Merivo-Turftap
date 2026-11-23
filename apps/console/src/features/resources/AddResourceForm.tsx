import {
  Button,
  Description,
  FieldError,
  Form,
  Input,
  Label,
  Radio,
  RadioGroup,
  TextField,
} from "@heroui/react";
import {
  DEFAULT_START_INTERVAL_MINUTES,
  RESOURCE_MINUTES,
  RESOURCE_TYPES,
  type ResourceType,
} from "@turftap/contract";
import { lkr } from "@turftap/ui";
import { type FormEvent, useState } from "react";

import { PriceField } from "../../components/PriceField";
import m from "../../i18n/en/resources";
import { useAddResource } from "./useChangeResources";

const DEFAULT_TYPE: ResourceType = "FUTSAL_COURT";
type Minutes = (typeof RESOURCE_MINUTES)[number];
const DEFAULT_SLOT_MINUTES: Minutes = 60;

export function AddResourceForm({ venueId }: { venueId: number }) {
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
      <PriceField label={m.priceLabel} value={rupees} onChange={setRupees} />
      <Button type="submit" isPending={addResource.isPending}>
        {m.submit}
      </Button>
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
    <RadioGroup
      name={name}
      orientation="horizontal"
      value={String(value)}
      onChange={(picked) => onChange(Number(picked) as Minutes)}
    >
      <Label>{label}</Label>
      {description && <Description>{description}</Description>}
      {RESOURCE_MINUTES.map((minutes) => (
        <Radio
          key={minutes}
          value={String(minutes)}
          isDisabled={longest !== undefined && minutes > longest}
        >
          <Radio.Control>
            <Radio.Indicator />
          </Radio.Control>
          <Radio.Content>
            <Label>{m.minutes(minutes)}</Label>
          </Radio.Content>
        </Radio>
      ))}
    </RadioGroup>
  );
}
