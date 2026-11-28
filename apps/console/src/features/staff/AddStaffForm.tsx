import { FieldError, Form, Input, Label, TextField } from "@heroui/react";
import { PhoneInput, STAFF_ROLES, type StaffRole } from "@turftap/contract";
import { type FormEvent, useState } from "react";

import { LoadingButton } from "../../components/LoadingButton";
import { ChoicePills } from "../../components/Pills";
import { SmoothHeight } from "../../components/SmoothHeight";
import m from "../../i18n/en/staff";
import tenants from "../../i18n/en/tenants";
import { TellThem } from "./TellThem";
import { useAddStaff } from "./useAddStaff";
import { EVERY_VENUE, type VenueAccess } from "./venueAccess";
import { VenueAccessFields } from "./VenueAccessFields";

const DEFAULT_ROLE: StaffRole = "FRONT_DESK";

/** SIG-03: add someone, then send them the sign-in link. */
export function AddStaffForm({ tenantName }: { tenantName: string }) {
  const addStaff = useAddStaff();
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<StaffRole>(DEFAULT_ROLE);
  const [access, setAccess] = useState<VenueAccess>(EVERY_VENUE);
  const [added, setAdded] = useState<{ phone: string; role: StaffRole }>();
  const isOwner = role === "OWNER";

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = { phone, role, ...(isOwner ? EVERY_VENUE : access) };
    addStaff.mutate(
      { body },
      {
        onSuccess: (reply) => {
          setAdded(reply.data);
          setPhone("");
          setAccess(EVERY_VENUE);
        },
      },
    );
  };

  return (
    <SmoothHeight>
      {added ? (
        <TellThem person={added} tenantName={tenantName} onAddAnother={() => setAdded(undefined)} />
      ) : (
        <Form className="grid animate-tt-rise gap-5" onSubmit={submit}>
          <TextField
            className="sm:w-72"
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
          <ChoicePills
            name="role"
            label={m.roleLabel}
            value={role}
            onChange={setRole}
            choices={STAFF_ROLES.map((value) => ({ value, label: tenants.roles[value] }))}
          />
          {!isOwner && <VenueAccessFields value={access} onChange={setAccess} />}
          <div className="flex flex-wrap items-center gap-3">
            <LoadingButton type="submit" isPending={addStaff.isPending}>
              {m.submit}
            </LoadingButton>
          </div>
        </Form>
      )}
    </SmoothHeight>
  );
}
