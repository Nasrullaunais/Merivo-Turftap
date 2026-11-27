import { useRouterState } from "@tanstack/react-router";
import type { MyTenant } from "@turftap/contract";
import { type ReactNode, useEffect, useState } from "react";

import m from "../i18n/en/shell";
import { ShellContext } from "./shell-context";
import { Sidebar } from "./Sidebar";
import { TenantPaused } from "./TenantPaused";

const RAIL_KEY = "turftap.sidebarFolded";
const WIDE_SCREEN = "(min-width: 768px)";

type Props = { tenant?: MyTenant; canSwitchTenant: boolean; children: ReactNode };

/** The sidebar and the page beside it. Below `md` the sidebar is a drawer over the page. */
export function AppShell({ tenant, canSwitchTenant, children }: Props) {
  const [folded, setFolded] = useState(() => localStorage.getItem(RAIL_KEY) === "true");
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  // The drawer covers the page, so it belongs to the page it was opened on and closes on any other.
  const [drawerPage, setDrawerPage] = useState<string>();
  const drawerOpen = drawerPage === pathname;
  const closeDrawer = () => setDrawerPage(undefined);

  useEffect(() => localStorage.setItem(RAIL_KEY, String(folded)), [folded]);
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && closeDrawer();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  const toggleNav = () => {
    if (window.matchMedia(WIDE_SCREEN).matches) setFolded((was) => !was);
    else setDrawerPage(drawerOpen ? undefined : pathname);
  };

  return (
    <ShellContext value={{ toggleNav }}>
      <div className="flex h-svh w-full overflow-hidden">
        <div className="hidden h-full shrink-0 md:flex">
          <Sidebar tenant={tenant} canSwitchTenant={canSwitchTenant} collapsed={folded} />
        </div>
        {drawerOpen && (
          <>
            <button
              type="button"
              aria-label={m.closeMenu}
              onClick={closeDrawer}
              className="fixed inset-0 z-40 animate-tt-fade bg-black/30 md:hidden"
            />
            <div className="fixed inset-y-0 start-0 z-50 animate-tt-rise md:hidden">
              <Sidebar tenant={tenant} canSwitchTenant={canSwitchTenant} collapsed={false} />
            </div>
          </>
        )}
        <div className="min-w-0 flex-1 overflow-y-auto">
          {tenant && !tenant.active && <TenantPaused />}
          {children}
        </div>
      </div>
    </ShellContext>
  );
}
