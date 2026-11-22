import { createFileRoute } from "@tanstack/react-router";

import { TenantPicker } from "../../features/tenants/TenantPicker";

export const Route = createFileRoute("/_signedIn/choose-tenant")({ component: ChooseTenantPage });

function ChooseTenantPage() {
  const { me } = Route.useRouteContext();
  return (
    <main className="mx-auto max-w-sm p-6">
      <TenantPicker tenants={me.tenants} />
    </main>
  );
}
