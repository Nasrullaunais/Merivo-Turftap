import { createFileRoute, redirect } from "@tanstack/react-router";

import { AddSlot } from "../../../components/AddSlot";
import { canOpen } from "../../../config/routePermissions";
import { AddStaffForm } from "../../../features/staff/AddStaffForm";
import { StaffList } from "../../../features/staff/StaffList";
import m from "../../../i18n/en/staff";
import { PageLayout } from "../../../layout/PageLayout";
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
    <PageLayout title={m.title} width="form">
      <StaffList
        canManage={can(tenant, "staff:update")}
        addSlot={
          can(tenant, "staff:create") && (
            <AddSlot label={m.addTitle}>{() => <AddStaffForm />}</AddSlot>
          )
        }
      />
    </PageLayout>
  );
}
