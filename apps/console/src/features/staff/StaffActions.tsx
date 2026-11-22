import { AlertDialog, Button, ListBox, Select } from "@heroui/react";
import { STAFF_ROLES, type StaffRole } from "@turftap/contract";
import type { Staff } from "@turftap/contract/client";

import m from "../../i18n/en/staff";
import tenants from "../../i18n/en/tenants";
import { useChangeStaff, useRemoveStaff } from "./useManageStaff";

export function StaffActions({ person }: { person: Staff }) {
  const changeRole = useChangeStaff();
  const removeStaff = useRemoveStaff();
  const who = person.name ?? person.phone;
  const path = { id: person.id };

  return (
    <div className="flex items-center gap-2">
      <Select
        aria-label={m.roleFor(who)}
        value={person.role}
        isDisabled={changeRole.isPending}
        onChange={(role) => {
          if (role !== person.role) changeRole.mutate({ path, body: { role: role as StaffRole } });
        }}
      >
        <Select.Trigger>
          <Select.Value />
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
      <AlertDialog>
        <Button variant="danger-soft" aria-label={m.removeFor(who)}>
          {m.remove}
        </Button>
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
                  {m.cancel}
                </Button>
                <Button slot="close" variant="danger" onPress={() => removeStaff.mutate({ path })}>
                  {m.remove}
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </div>
  );
}
