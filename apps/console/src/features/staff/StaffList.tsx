import { Spinner } from "@heroui/react";

import m from "../../i18n/en/staff";
import tenants from "../../i18n/en/tenants";
import { StaffActions } from "./StaffActions";
import { useStaff } from "./useStaff";

/** Owners can change each person's role or remove them; everyone else only reads the list. */
export function StaffList({ canManage }: { canManage: boolean }) {
  const { data: staff, isPending } = useStaff();

  if (isPending) return <Spinner aria-label={m.loading} />;

  return (
    <ul className="grid divide-y divide-separator">
      {staff?.map((person) => (
        <li key={person.id} className="flex flex-wrap items-center gap-x-3 py-2">
          <span className="font-medium">{person.name ?? m.noName}</span>
          <span>{person.phone}</span>
          <span className="ml-auto">
            {canManage ? (
              <StaffActions person={person} />
            ) : (
              <span className="text-muted">{tenants.roles[person.role]}</span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
