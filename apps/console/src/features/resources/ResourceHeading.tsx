import { useQuery } from "@tanstack/react-query";
import { getResourceOptions, getVenueOptions } from "@turftap/contract/client/react-query";
import { Clock, LayoutGrid, Repeat } from "lucide-react";

import { BackLink } from "../../components/BackLink";
import { RecordHeader } from "../../components/RecordHeader";
import { SkeletonLine } from "../../components/SkeletonRows";
import m from "../../i18n/en/resources";
import { TYPE_ICONS } from "../../components/resourceLook";
import { useResource } from "./useResource";

/** The resource page's header card; a skeleton holds its place while the resource loads. */
export function ResourceHeader({ resourceId }: { resourceId: number }) {
  const { data: resource } = useResource(resourceId);
  return (
    <RecordHeader
      hue="place"
      icon={resource ? TYPE_ICONS[resource.type] : LayoutGrid}
      name={resource ? resource.name : <SkeletonLine label={m.loadingOne} className="h-7 w-48" />}
      details={<ResourceDetails resourceId={resourceId} />}
    />
  );
}

/** The top row's title: the venue the resource belongs to. */
export function ResourceVenueName({ resourceId }: { resourceId: number }) {
  const { data: venueId } = useQuery({
    ...getResourceOptions({ path: { id: resourceId } }),
    select: (reply) => reply.data.venueId,
  });
  const { data: name } = useQuery({
    ...getVenueOptions({ path: { id: venueId ?? 0 } }),
    enabled: venueId !== undefined,
    select: (reply) => reply.data.name,
  });
  return name ?? <SkeletonLine label={m.loadingOne} className="h-5 w-40" />;
}

export function ResourceBackLink({ resourceId }: { resourceId: number }) {
  const { data: resource } = useResource(resourceId);
  if (!resource) return null;
  return (
    <BackLink to="/venues/$venueId" params={{ venueId: resource.venueId }} label={m.backToVenue} />
  );
}

function ResourceDetails({ resourceId }: { resourceId: number }) {
  const { data: resource } = useResource(resourceId);
  if (!resource) return <SkeletonLine label={m.loadingOne} className="h-4 w-72" />;
  return (
    <span className="flex flex-wrap gap-x-4 gap-y-1">
      <span>{m.types[resource.type]}</span>
      <span className="inline-flex items-center gap-1.5 tabular-nums">
        <Clock aria-hidden size={15} />
        {m.slotLength(resource.slotMinutes)}
      </span>
      <span className="inline-flex items-center gap-1.5 tabular-nums">
        <Repeat aria-hidden size={15} />
        {m.startsEvery(resource.startIntervalMinutes)}
      </span>
    </span>
  );
}
