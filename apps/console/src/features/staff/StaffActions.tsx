import { AlertDialog, Button, ListBox, Select } from "@heroui/react";
import { STAFF_ROLES, type StaffRole } from "@turftap/contract";
import type { Staff } from "@turftap/contract/client";
import { UserX } from "lucide-react";

import { IconAction } from "../../components/IconAction";
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
        className="w-36"
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
        <IconAction
          danger
          icon={UserX}
          label={m.removeFor(who)}
          hint={m.remove}
          isPending={removeStaff.isPending}
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
