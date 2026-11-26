import { Link } from "@tanstack/react-router";
import { ChevronRight, Store } from "lucide-react";

import { CardSkeletons } from "../../components/CardSkeletons";
import { CoverPhoto } from "../../components/CoverPhoto";
import { arrivalDelay } from "../../components/look";
import { TYPE_ICONS } from "../../components/resourceLook";
import m from "../../i18n/en/resources";
import { ResourcePrice } from "./ResourcePrice";
import { useResources } from "./useResources";

const CARDS_START_MS = 200;

/** POR-02: what a venue rents out, with photos and prices. A tap opens its free slots. */
export function ResourceList({ venueId }: { venueId: number }) {
  const { data: resources, isPending } = useResources(venueId);

  if (isPending) return <CardSkeletons label={m.loading} />;
  if (!resources?.length) {
    return (
      <div className="tt-panel grid animate-tt-rise justify-items-center gap-3 px-6 py-12 text-center">
        <span className="tt-tile tt-hue-place size-12 rounded-xl">
          <Store size={24} aria-hidden />
        </span>
        <p className="text-muted">{m.empty}</p>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {resources.map((resource, index) => {
        const Icon = TYPE_ICONS[resource.type];
        return (
          <li
            key={resource.id}
            className="animate-tt-card-in"
            style={arrivalDelay(index, CARDS_START_MS)}
          >
            <Link
              to="/resources/$resourceId"
              params={{ resourceId: resource.id }}
              className="tt-card group flex h-full flex-col overflow-hidden outline-offset-2 active:scale-[0.98]"
            >
              <CoverPhoto of={{ resourceId: resource.id }} alt={m.photoAlt(resource.name)} />
              <div className="flex flex-1 items-center gap-3 p-4">
                <span className="tt-tile tt-hue-place size-11 rounded-xl">
                  <Icon size={22} aria-hidden />
                </span>
                <div className="grid min-w-0 flex-1 gap-0.5">
                  <h3 className="truncate text-base font-semibold tracking-tight">
                    {resource.name}
                  </h3>
                  <ResourcePrice resource={resource} />
                </div>
                <ChevronRight
                  size={20}
                  aria-hidden
                  className="shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
