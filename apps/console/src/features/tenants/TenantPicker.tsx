import { Button } from "@heroui/react";
import type { MyTenant } from "@turftap/contract";

import { useOpenTenant } from "../../lib/tenant/useOpenTenant";
import m from "../../i18n/en/tenants";

export function TenantPicker({ tenants }: { tenants: MyTenant[] }) {
  const openTenant = useOpenTenant();

  return (
    <section className="grid gap-4">
      <h1 className="text-2xl font-semibold">{m.pickTitle}</h1>
      <p className="text-muted">{m.pickHint}</p>
      <ul className="grid gap-2">
        {tenants.map((tenant) => (
          <li key={tenant.id}>
            <Button fullWidth variant="secondary" onPress={() => openTenant(tenant.id)}>
              <span className="font-medium">{tenant.name}</span>
              <span className="text-muted">{m.roles[tenant.role]}</span>
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
