import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { setActiveTenantId } from "./activeTenant";

/** Switches to another tenant. Cached data belongs to the old tenant, so all of it is dropped. */
export function useOpenTenant() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return (tenantId: number) => {
    setActiveTenantId(tenantId);
    queryClient.clear();
    void navigate({ to: "/" });
  };
}
