import { createFileRoute } from "@tanstack/react-router";

import m from "../../../i18n/en/shell";
import { PageLayout } from "../../../layout/PageLayout";

export const Route = createFileRoute("/_signedIn/_tenant/")({ component: HomePage });

function HomePage() {
  const { tenant } = Route.useRouteContext();
  return (
    <PageLayout title={tenant?.name ?? m.brand}>
      <p className="text-muted">{m.comingSoon}</p>
    </PageLayout>
  );
}
