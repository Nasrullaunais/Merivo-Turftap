import { createFileRoute, redirect } from "@tanstack/react-router";

import { canOpen } from "../../../config/routePermissions";
import { AddStaffForm } from "../../../features/staff/AddStaffForm";
import { StaffList } from "../../../features/staff/StaffList";
import m from "../../../i18n/en/staff";
import { can } from "../../../lib/tenant/activeTenant";

export const Route = createFileRoute("/_signedIn/_tenant/staff")({
  beforeLoad: ({ context }) => {
    if (!canOpen(context.tenant, "/staff")) throw redirect({ to: "/" });
  },
  component: StaffPage,
});

function StaffPage() {
  const { tenant } = Route.useRouteContext();

  return (
    <main className="mx-auto grid max-w-2xl gap-6 p-6">
      <h1 className="text-2xl font-semibold">{m.title}</h1>
      {can(tenant, "staff:create") && <AddStaffForm />}
      <StaffList canManage={can(tenant, "staff:update")} />
    </main>
  );
}
