import { Chip } from "@heroui/react";
import { Link } from "@tanstack/react-router";
import { formatMoney } from "@turftap/ui";

import { SkeletonRows } from "../../components/SkeletonRows";
import m from "../../i18n/en/resources";
import { TurnOffResource } from "./TurnOffResource";
import { useResources } from "./useResources";

type Props = { venueId: number; canTurnOff: boolean };

export function ResourceList({ venueId, canTurnOff }: Props) {
  const { data: resources, isPending } = useResources(venueId);

  if (isPending) return <SkeletonRows label={m.loading} />;
  if (!resources?.length) return <p className="text-muted">{m.none}</p>;

  return (
    <ul className="grid divide-y divide-separator">
      {resources.map((resource) => (
        <li key={resource.id} className="flex flex-wrap items-center gap-x-3 py-2">
          <Link
            to="/resources/$resourceId"
            params={{ resourceId: resource.id }}
            className="font-medium underline-offset-4 hover:underline"
          >
            {resource.name}
          </Link>
          <span className="text-muted">
            {m.details(
              m.types[resource.type],
              resource.slotMinutes,
              resource.startIntervalMinutes,
              formatMoney(resource.price),
            )}
          </span>
          <span className="ml-auto">
            {!resource.active && <Chip size="sm">{m.turnedOff}</Chip>}
            {resource.active && canTurnOff && <TurnOffResource resource={resource} />}
          </span>
        </li>
      ))}
    </ul>
  );
}
