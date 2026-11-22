import { createFileRoute } from "@tanstack/react-router";

import m from "../i18n/en/shell";

export const Route = createFileRoute("/")({ component: HomePage });

function HomePage() {
  return (
    <main className="grid gap-2 p-6">
      <h1 className="text-2xl font-semibold">{m.title}</h1>
      <p className="text-muted">{m.comingSoon}</p>
    </main>
  );
}
