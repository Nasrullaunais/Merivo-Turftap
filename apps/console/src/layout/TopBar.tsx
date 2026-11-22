import { Button } from "@heroui/react";
import { Link, useNavigate } from "@tanstack/react-router";
import type { MyTenant } from "@turftap/contract";

import { canOpen } from "../config/routePermissions";
import { useSignOut } from "../lib/auth/useSignOut";
import m from "../i18n/en/shell";
import tenants from "../i18n/en/tenants";

type TopBarProps = { tenant?: MyTenant; canSwitchTenant: boolean };

export function TopBar({ tenant, canSwitchTenant }: TopBarProps) {
  const signOut = useSignOut();
  const navigate = useNavigate();

  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-separator px-6 py-3">
      <Link to="/" className="font-semibold">
        {m.title}
      </Link>
      {tenant && (
        <span className="text-muted">
          {tenant.name} · {tenants.roles[tenant.role]}
        </span>
      )}
      <nav className="flex gap-4">
        {canOpen(tenant, "/venues") && (
          <Link to="/venues" className="text-sm" activeProps={{ className: "font-semibold" }}>
            {m.nav.venues}
          </Link>
        )}
        {canOpen(tenant, "/staff") && (
          <Link to="/staff" className="text-sm" activeProps={{ className: "font-semibold" }}>
            {m.nav.staff}
          </Link>
        )}
      </nav>
      <span className="ml-auto flex gap-2">
        {canSwitchTenant && (
          <Button size="sm" variant="ghost" onPress={() => navigate({ to: "/choose-tenant" })}>
            {m.switchTenant}
          </Button>
        )}
        <Button size="sm" variant="ghost" onPress={signOut}>
          {m.signOut}
        </Button>
      </span>
    </header>
  );
}
