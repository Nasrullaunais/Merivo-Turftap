import { createRouter, type RouterHistory } from "@tanstack/react-router";
import { getMeOptions } from "@turftap/contract/client/react-query";
import { createQueryClient } from "@turftap/ui";

import { installApiTransport } from "./lib/api/transport";
import { signOut } from "./lib/auth/session";
import { routeTree } from "./routeTree.gen";

const TENANT_OFF = "tt_plt_010";

/** The router and query client, wired so a 401 from the API sends the user back to sign-in. */
export function createApp(options: { history?: RouterHistory } = {}) {
  installApiTransport();
  const queryClient = createQueryClient({
    onUnauthorized: () => {
      signOut();
      queryClient.clear();
      void router.navigate({ to: "/sign-in" });
    },
  });
  const router = createRouter({
    routeTree,
    history: options.history,
    defaultPreload: "intent",
    context: { queryClient },
  });
  // PLA-03: a save refused because the tenant was just turned off brings up the paused banner.
  queryClient.getMutationCache().subscribe((event) => {
    if (event.type !== "updated" || event.action.type !== "error") return;
    if (event.action.error.code !== TENANT_OFF) return;
    void queryClient
      .refetchQueries({ queryKey: getMeOptions().queryKey })
      .then(() => router.invalidate());
  });
  return { router, queryClient };
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createApp>["router"];
  }
}
