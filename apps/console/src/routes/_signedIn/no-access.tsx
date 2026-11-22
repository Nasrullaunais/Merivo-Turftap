import { createFileRoute } from "@tanstack/react-router";

import { NoTenantAccess } from "../../features/tenants/NoTenantAccess";

export const Route = createFileRoute("/_signedIn/no-access")({
  component: () => (
    <main className="mx-auto max-w-sm p-6">
      <NoTenantAccess />
    </main>
  ),
});
