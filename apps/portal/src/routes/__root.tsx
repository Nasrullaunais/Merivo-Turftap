import { Toast } from "@heroui/react";
import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";

import { Shell } from "../layout/Shell";

export type RouterContext = { queryClient: QueryClient };

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <>
      <Shell>
        <Outlet />
      </Shell>
      <Toast.Provider placement="bottom" />
    </>
  ),
});
