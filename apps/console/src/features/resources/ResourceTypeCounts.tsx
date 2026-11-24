import type { ResourceType } from "@turftap/contract";

import m from "../../i18n/en/resources";
import { TYPE_ICONS } from "../../components/resourceLook";
import { useResources } from "./useResources";

/** How many working resources of each type a venue has: one icon and number per type. */
export function ResourceTypeCounts({ venueId }: { venueId: number }) {
  const { data: resources } = useResources(venueId);
  const working = resources?.filter((resource) => resource.active) ?? [];
  if (working.length === 0) return null;
  const counts = new Map<ResourceType, number>();
  for (const resource of working) counts.set(resource.type, (counts.get(resource.type) ?? 0) + 1);
  return (
    <span role="img" aria-label={m.count(working.length)} className="flex gap-1.5">
      {[...counts].map(([type, count]) => {
        const Icon = TYPE_ICONS[type];
        return (
          <span
            key={type}
            className="inline-flex animate-tt-pop items-center gap-1 rounded-md bg-[var(--tt-field)] px-1.5 py-0.5 text-xs font-medium tabular-nums tt-hue-place"
          >
            <Icon aria-hidden size={13} className="text-[var(--tt-hue)]" />
            {count}
          </span>
        );
      })}
    </span>
  );
}
