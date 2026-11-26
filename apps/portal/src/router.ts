import { createRouter } from "@tanstack/react-router";
import { createQueryClient } from "@turftap/ui";

import { installApiTransport } from "./lib/api/transport";
import { signOut } from "./lib/auth/session";
import { routeTree } from "./routeTree.gen";

/** The router and query client, wired so a refused sign-in sends the customer back to sign in. */
export function createApp() {
  installApiTransport();
  const queryClient = createQueryClient({
    onUnauthorized: () => {
      signOut();
      queryClient.clear();
      const { pathname, href } = router.state.location;
      if (pathname !== "/sign-in") void router.navigate({ to: "/sign-in", search: { back: href } });
    },
  });
  const router = createRouter({
    routeTree,
    defaultPreload: "intent",
    context: { queryClient },
  });
  return { router, queryClient };
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createApp>["router"];
  }
  interface HistoryState {
    /** BKG-02: the time list was opened because the chosen time went to someone else. */
    justTaken?: boolean;
  }
}
