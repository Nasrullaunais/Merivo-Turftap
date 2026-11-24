import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { AppShell } from "../../layout/AppShell";
import { useLiveUpdates } from "../../lib/live-updates/useLiveUpdates";
import { chooseTenant, setActiveTenantId } from "../../lib/tenant/activeTenant";

export const Route = createFileRoute("/_signedIn/_tenant")({
  beforeLoad: ({ context }) => {
    const choice = chooseTenant(context.me);
    if (choice.kind === "pick") throw redirect({ to: "/choose-tenant" });
    if (choice.kind === "noAccess") throw redirect({ to: "/no-access" });
    if (choice.kind === "noTenant") return { tenant: undefined };
    setActiveTenantId(choice.tenant.id);
    return { tenant: choice.tenant };
  },
  component: TenantLayout,
});

function TenantLayout() {
  const { me, tenant } = Route.useRouteContext();
  useLiveUpdates(tenant?.id);
  return (
    <AppShell tenant={tenant} canSwitchTenant={me.tenants.length > 1}>
      <Outlet />
    </AppShell>
  );
}
