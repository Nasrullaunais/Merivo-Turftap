import { createFileRoute } from "@tanstack/react-router";

import { CentredPanel } from "../../components/CentredPanel";
import { NoTenantAccess } from "../../features/tenants/NoTenantAccess";
import m from "../../i18n/en/tenants";

export const Route = createFileRoute("/_signedIn/no-access")({
  component: () => (
    <CentredPanel title={m.noAccessTitle}>
      <NoTenantAccess />
    </CentredPanel>
  ),
});
