import { FieldError, Form, Input, Label, TextField } from "@heroui/react";
import { MAX_PLAN_LENGTH, PLAN_LENGTH_UNITS, type PlanLengthUnit } from "@turftap/contract";
import type { Venue } from "@turftap/contract/client";
import { lkr } from "@turftap/ui";
import { MapPin } from "lucide-react";
import { type FormEvent, useState } from "react";

import { LoadingButton } from "../../components/LoadingButton";
import { ChoicePills } from "../../components/Pills";
import { PriceField } from "../../components/PriceField";
import m from "../../i18n/en/membershipPlans";
import { useAddMembershipPlan } from "./useChangeMembershipPlans";

const DEFAULT_UNIT: PlanLengthUnit = "MONTHS";
const WHOLE_NUMBER = /^[1-9]\d*$/;

type Props = {
  venues: Pick<Venue, "id" | "name">[];
  venueId: number;
  onAdded: () => void;
};

/** MEM-01. The venue choice shows only when there is more than one venue to pick. */
export function AddPlanForm({ venues, venueId: firstVenueId, onAdded }: Props) {
  const addPlan = useAddMembershipPlan();
  const [venueId, setVenueId] = useState(firstVenueId);
  const [name, setName] = useState("");
  const [lengthCount, setLengthCount] = useState("1");
  const [lengthUnit, setLengthUnit] = useState<PlanLengthUnit>(DEFAULT_UNIT);
  const [rupees, setRupees] = useState("");
  const longest = MAX_PLAN_LENGTH[lengthUnit];

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    addPlan.mutate(
      {
        body: {
          venueId,
          name,
          lengthCount: Number(lengthCount),
          lengthUnit,
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
      {venues.length > 1 && (
        <ChoicePills
          name="venueId"
          label={m.venueLabel}
          value={String(venueId)}
          onChange={(picked) => setVenueId(Number(picked))}
          choices={venues.map((venue) => ({
            value: String(venue.id),
            label: venue.name,
            icon: MapPin,
          }))}
        />
      )}
      <TextField name="name" isRequired value={name} onChange={setName}>
        <Label>{m.nameLabel}</Label>
        <Input placeholder="Gym monthly" />
        <FieldError />
      </TextField>
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">{m.lengthLabel}</legend>
        <div className="flex flex-wrap items-start gap-3">
          <TextField
            name="lengthCount"
            type="number"
            isRequired
            aria-label={m.lengthLabel}
            value={lengthCount}
            onChange={setLengthCount}
            validate={(count) =>
              WHOLE_NUMBER.test(count) && Number(count) <= longest
                ? null
                : m.lengthInvalid(longest, lengthUnit)
            }
            className="w-24"
          >
            <Input min={1} max={longest} step={1} />
            <FieldError />
          </TextField>
          <ChoicePills
            name="lengthUnit"
            label={m.unitLabel}
            value={lengthUnit}
            onChange={setLengthUnit}
            choices={PLAN_LENGTH_UNITS.map((unit) => ({ value: unit, label: m.units[unit] }))}
            hideLabel
          />
        </div>
        <p className="text-xs text-muted">
          {m.lengthHint(MAX_PLAN_LENGTH.DAYS, MAX_PLAN_LENGTH.MONTHS)}
        </p>
      </fieldset>
      <div className="sm:w-64">
        <PriceField label={m.priceLabel} value={rupees} onChange={setRupees} />
      </div>
      <LoadingButton type="submit" isPending={addPlan.isPending} className="justify-self-start">
        {m.submit}
      </LoadingButton>
    </Form>
  );
}
