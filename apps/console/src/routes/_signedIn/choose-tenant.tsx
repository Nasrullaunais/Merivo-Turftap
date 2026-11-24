import { createFileRoute } from "@tanstack/react-router";

import { CentredPanel } from "../../components/CentredPanel";
import { TenantPicker } from "../../features/tenants/TenantPicker";
import m from "../../i18n/en/tenants";

export const Route = createFileRoute("/_signedIn/choose-tenant")({ component: ChooseTenantPage });

function ChooseTenantPage() {
  const { me } = Route.useRouteContext();
  return (
    <CentredPanel title={m.pickTitle}>
      <TenantPicker tenants={me.tenants} />
    </CentredPanel>
  );
}
