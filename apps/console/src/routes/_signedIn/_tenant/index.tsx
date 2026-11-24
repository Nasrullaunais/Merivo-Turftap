import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import { sweepIndex } from "../../../components/look";
import { TopicTile } from "../../../components/TopicTile";
import { NAV_GROUPS } from "../../../config/nav";
import { canOpen } from "../../../config/routePermissions";
import m from "../../../i18n/en/shell";
import { PageLayout } from "../../../layout/PageLayout";

export const Route = createFileRoute("/_signedIn/_tenant/")({ component: HomePage });

/** Where each section of the console starts, in the sidebar's order and colours. */
function HomePage() {
  const { tenant } = Route.useRouteContext();
  const sections = NAV_GROUPS.flat().filter((section) => canOpen(tenant, section.to));
  return (
    <PageLayout title={tenant?.name ?? m.brand}>
      <ul className="grid gap-3 tt-sweep sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section, index) => (
          <li key={section.to} style={sweepIndex(index)}>
            <Link
              to={section.to}
              className="group flex items-center gap-4 tt-panel p-4 outline-none tt-t1 hover:bg-[var(--tt-hover)] focus-visible:ring-2 focus-visible:ring-focus"
            >
              <TopicTile hue={section.hue} icon={section.icon} size={44} className="rounded-xl" />
              <span className="flex-1 font-medium">{section.label}</span>
              <ChevronRight aria-hidden size={18} className="text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </PageLayout>
  );
}
