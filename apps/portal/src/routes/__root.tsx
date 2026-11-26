import { Toast } from "@heroui/react";
import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet, retainSearchParams } from "@tanstack/react-router";

import { Shell } from "../layout/Shell";

export type RouterContext = { queryClient: QueryClient };

type RootSearch = { tenant?: string };

export const Route = createRootRouteWithContext<RouterContext>()({
  // Locally the tenant comes from `?tenant=`, so every link keeps it.
  validateSearch: (search): RootSearch =>
    typeof search.tenant === "string" ? { tenant: search.tenant } : {},
  search: { middlewares: [retainSearchParams(["tenant"])] },
  component: () => (
    <>
      <Shell>
        <Outlet />
      </Shell>
      <Toast.Provider placement="bottom" />
    </>
  ),
});
