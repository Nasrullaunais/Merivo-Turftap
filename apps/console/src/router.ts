import { createRouter, type RouterHistory } from "@tanstack/react-router";
import { createQueryClient } from "@turftap/ui";

import { installApiTransport } from "./lib/api/transport";
import { signOut } from "./lib/auth/session";
import { routeTree } from "./routeTree.gen";

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
  return { router, queryClient };
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createApp>["router"];
  }
}
