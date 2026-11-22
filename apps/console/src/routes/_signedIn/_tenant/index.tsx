import { createFileRoute } from "@tanstack/react-router";

import m from "../../../i18n/en/shell";

export const Route = createFileRoute("/_signedIn/_tenant/")({ component: HomePage });

function HomePage() {
  return (
    <main className="grid gap-2 p-6">
      <p className="text-muted">{m.comingSoon}</p>
    </main>
  );
}
