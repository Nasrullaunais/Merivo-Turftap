import { Spinner } from "@heroui/react";
import { Link } from "@tanstack/react-router";
import { formatMoney } from "@turftap/ui";

import m from "../../i18n/en/resources";
import { useResource } from "./useResource";

export function ResourceHeading({ resourceId }: { resourceId: number }) {
  const { data: resource } = useResource(resourceId);

  if (!resource) return <Spinner aria-label={m.loading} />;
  return (
    <header className="grid gap-1">
      <Link
        to="/venues/$venueId"
        params={{ venueId: resource.venueId }}
        className="text-sm text-muted underline-offset-4 hover:underline"
      >
        {m.backToVenue}
      </Link>
      <h1 className="text-2xl font-semibold">{resource.name}</h1>
      <p className="text-muted">
        {m.details(
          m.types[resource.type],
          resource.slotMinutes,
          resource.startIntervalMinutes,
          formatMoney(resource.price),
        )}
      </p>
    </header>
  );
}
