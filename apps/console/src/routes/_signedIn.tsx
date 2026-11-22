import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getMeOptions } from "@turftap/contract/client/react-query";

import { isSignedIn } from "../lib/auth/session";

export const Route = createFileRoute("/_signedIn")({
  beforeLoad: async ({ context }) => {
    if (!isSignedIn()) throw redirect({ to: "/sign-in" });
    const reply = await context.queryClient.ensureQueryData(getMeOptions());
    return { me: reply.data };
  },
  component: Outlet,
});
