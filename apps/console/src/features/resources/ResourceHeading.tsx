import { formatMoney } from "@turftap/ui";

import { BackLink } from "../../components/BackLink";
import { SkeletonLine } from "../../components/SkeletonRows";
import m from "../../i18n/en/resources";
import { useResource } from "./useResource";

export function ResourceName({ resourceId }: { resourceId: number }) {
  const { data: resource } = useResource(resourceId);
  return resource ? resource.name : <SkeletonLine label={m.loadingOne} className="h-7 w-48" />;
}

export function ResourceBackLink({ resourceId }: { resourceId: number }) {
  const { data: resource } = useResource(resourceId);
  if (!resource) return null;
  return (
    <BackLink to="/venues/$venueId" params={{ venueId: resource.venueId }} label={m.backToVenue} />
  );
}

export function ResourceDetails({ resourceId }: { resourceId: number }) {
  const { data: resource } = useResource(resourceId);
  if (!resource) return <SkeletonLine label={m.loadingOne} className="h-4 w-80" />;
  return (
    <p className="-mt-4 text-muted">
      {m.details(
        m.types[resource.type],
        resource.slotMinutes,
        resource.startIntervalMinutes,
        formatMoney(resource.price),
      )}
    </p>
  );
}
