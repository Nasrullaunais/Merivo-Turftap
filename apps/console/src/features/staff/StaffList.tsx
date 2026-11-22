import { Spinner } from "@heroui/react";

import m from "../../i18n/en/staff";
import tenants from "../../i18n/en/tenants";
import { useStaff } from "./useStaff";

export function StaffList() {
  const { data: staff, isPending } = useStaff();

  if (isPending) return <Spinner aria-label={m.loading} />;

  return (
    <ul className="grid divide-y divide-separator">
      {staff?.map((person) => (
        <li key={person.id} className="flex flex-wrap items-baseline gap-x-3 py-2">
          <span className="font-medium">{person.name ?? m.noName}</span>
          <span>{person.phone}</span>
          <span className="ml-auto text-muted">{tenants.roles[person.role]}</span>
        </li>
      ))}
    </ul>
  );
}
