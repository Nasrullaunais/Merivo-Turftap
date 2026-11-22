import { createFileRoute } from "@tanstack/react-router";

import { AddStaffForm } from "../../../features/staff/AddStaffForm";
import { StaffList } from "../../../features/staff/StaffList";
import m from "../../../i18n/en/staff";

export const Route = createFileRoute("/_signedIn/_tenant/staff")({ component: StaffPage });

function StaffPage() {
  const { tenant } = Route.useRouteContext();
  const isOwner = tenant?.role === "OWNER";
  return (
    <main className="mx-auto grid max-w-2xl gap-6 p-6">
      <h1 className="text-2xl font-semibold">{m.title}</h1>
      {isOwner && <AddStaffForm />}
      <StaffList canManage={isOwner} />
    </main>
  );
}
