import { AlertDialog, Button, ListBox, Select } from "@heroui/react";
import { STAFF_ROLES, type StaffRole } from "@turftap/contract";
import type { Staff } from "@turftap/contract/client";
import { UserX } from "lucide-react";

import { IconAction } from "../../components/IconAction";
import m from "../../i18n/en/staff";
import tenants from "../../i18n/en/tenants";
import { ROLE_ICONS } from "./roleLook";
import { useChangeStaff, useRemoveStaff } from "./useManageStaff";

const whoIs = (person: Staff) => person.name ?? person.phone;

export function StaffRoleSelect({ person }: { person: Staff }) {
  const changeRole = useChangeStaff();
  const Icon = ROLE_ICONS[person.role];
  return (
    <Select
      aria-label={m.roleFor(whoIs(person))}
      value={person.role}
      isDisabled={changeRole.isPending}
      onChange={(role) => {
        if (role !== person.role)
          changeRole.mutate({ path: { id: person.id }, body: { role: role as StaffRole } });
      }}
    >
      <Select.Trigger className="gap-2 tt-hue-people">
        <Icon aria-hidden size={15} className="shrink-0 text-[var(--tt-hue)]" />
        <Select.Value key={person.role} className="animate-tt-fade" />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {STAFF_ROLES.map((role) => (
            <ListBox.Item key={role} id={role} textValue={tenants.roles[role]}>
              {tenants.roles[role]}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

export function RemoveStaff({ person }: { person: Staff }) {
  const removeStaff = useRemoveStaff();
  const who = whoIs(person);
  return (
    <AlertDialog>
      <IconAction
        danger
        icon={UserX}
        label={m.removeFor(who)}
        hint={m.remove}
        isPending={removeStaff.isPending}
        className="-me-1.5 -mt-1"
      />
      <AlertDialog.Backdrop>
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>{m.removeTitle(who)}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>{m.removeHint}</AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot="close" variant="tertiary">
                {m.keep}
              </Button>
              <Button
                slot="close"
                variant="danger"
                onPress={() => removeStaff.mutate({ path: { id: person.id } })}
              >
                {m.remove}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}
