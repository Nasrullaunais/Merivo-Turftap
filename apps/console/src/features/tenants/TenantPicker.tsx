import type { MyTenant } from "@turftap/contract";
import { ChevronRight } from "lucide-react";

import { useOpenTenant } from "../../lib/tenant/useOpenTenant";
import m from "../../i18n/en/tenants";

export function TenantPicker({ tenants }: { tenants: MyTenant[] }) {
  const openTenant = useOpenTenant();

  return (
    <ul className="-mx-2 grid gap-1">
      {tenants.map((tenant) => (
        <li key={tenant.id}>
          <button
            type="button"
            onClick={() => openTenant(tenant.id)}
            className="flex w-full cursor-pointer items-center gap-3 rounded-lg p-2 text-start outline-none tt-t1 hover:bg-[var(--tt-hover)] focus-visible:ring-2 focus-visible:ring-focus"
          >
            <span
              aria-hidden
              className="grid size-9 shrink-0 place-items-center rounded-lg bg-foreground text-sm font-semibold text-background"
            >
              {tenant.name.charAt(0).toUpperCase()}
            </span>
            <span className="grid min-w-0 flex-1">
              <span className="truncate font-medium">{tenant.name}</span>
              <span className="text-sm text-muted">{m.roles[tenant.role]}</span>
            </span>
            <ChevronRight aria-hidden size={18} className="text-muted" />
          </button>
        </li>
      ))}
    </ul>
  );
}
