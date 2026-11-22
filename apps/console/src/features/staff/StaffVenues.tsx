import { Button, Form } from "@heroui/react";
import type { Staff } from "@turftap/contract/client";
import { type FormEvent, useState } from "react";

import m from "../../i18n/en/staff";
import { useChangeStaff } from "./useManageStaff";
import { useVenueChoices } from "./useVenueChoices";
import type { VenueAccess } from "./venueAccess";
import { VenueAccessFields } from "./VenueAccessFields";

/** Where a person works. Owners can change it for anyone but another Owner, who has every venue. */
export function StaffVenues({ person, canManage }: { person: Staff; canManage: boolean }) {
  const { data: venues } = useVenueChoices();
  const [editing, setEditing] = useState(false);
  const names = new Map(venues?.map((venue) => [venue.id, venue.name]));
  const who = person.name ?? person.phone;
  const summary = person.allVenues
    ? m.allVenues
    : person.venueIds.map((id) => names.get(id) ?? m.unknownVenue(id)).join(", ");

  if (editing) return <ChangeVenuesForm person={person} onDone={() => setEditing(false)} />;

  return (
    <div className="flex items-center gap-3 text-sm text-muted">
      <span>{summary}</span>
      {canManage && person.role !== "OWNER" && (
        <Button
          size="sm"
          variant="ghost"
          aria-label={m.changeVenuesFor(who)}
          onPress={() => setEditing(true)}
        >
          {m.changeVenues}
        </Button>
      )}
    </div>
  );
}

function ChangeVenuesForm({ person, onDone }: { person: Staff; onDone: () => void }) {
  const changeStaff = useChangeStaff();
  const [access, setAccess] = useState<VenueAccess>({
    allVenues: person.allVenues,
    venueIds: person.venueIds,
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    changeStaff.mutate({ path: { id: person.id }, body: access }, { onSuccess: onDone });
  };

  return (
    <Form className="grid gap-3" onSubmit={submit}>
      <VenueAccessFields value={access} onChange={setAccess} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" isPending={changeStaff.isPending}>
          {m.save}
        </Button>
        <Button size="sm" variant="tertiary" onPress={onDone}>
          {m.cancel}
        </Button>
      </div>
    </Form>
  );
}
