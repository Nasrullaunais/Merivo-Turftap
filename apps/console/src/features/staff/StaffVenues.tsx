import { Button, Form, Popover } from "@heroui/react";
import type { Staff } from "@turftap/contract/client";
import { MapPin, Pencil } from "lucide-react";
import { type FormEvent, useState } from "react";

import { IconAction } from "../../components/IconAction";
import { LoadingButton } from "../../components/LoadingButton";
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
  const venueNames = person.allVenues
    ? [m.allVenues]
    : person.venueIds.map((id) => names.get(id) ?? m.unknownVenue(id));

  return (
    <span className="flex flex-wrap items-center gap-1">
      {venueNames.map((name) => (
        <span
          key={name}
          className="inline-flex animate-tt-pop items-center gap-1 rounded-md bg-[var(--tt-field)] px-1.5 py-0.5 text-xs tt-hue-place"
        >
          <MapPin aria-hidden size={11} className="text-[var(--tt-hue)]" />
          {name}
        </span>
      ))}
      {canManage && person.role !== "OWNER" && (
        <Popover isOpen={editing} onOpenChange={setEditing}>
          <IconAction icon={Pencil} label={m.changeVenuesFor(who)} hint={m.changeVenues} />
          <Popover.Content placement="bottom start" className="w-80">
            <Popover.Dialog aria-label={m.changeVenuesFor(who)}>
              <ChangeVenuesForm person={person} onDone={() => setEditing(false)} />
            </Popover.Dialog>
          </Popover.Content>
        </Popover>
      )}
    </span>
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
        <LoadingButton type="submit" size="sm" isPending={changeStaff.isPending}>
          {m.save}
        </LoadingButton>
        <Button size="sm" variant="tertiary" onPress={onDone}>
          {m.cancel}
        </Button>
      </div>
    </Form>
  );
}
