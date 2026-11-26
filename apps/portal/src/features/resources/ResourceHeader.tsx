import { Skeleton } from "@heroui/react";
import type { Resource } from "@turftap/contract/client";

import { CoverPhoto } from "../../components/CoverPhoto";
import { TYPE_ICONS } from "../../components/resourceLook";
import m from "../../i18n/en/resources";
import { ResourcePrice } from "./ResourcePrice";

/** The top of a resource's page: its photo, name, type and price. */
export function ResourceHeader({ resource }: { resource?: Resource }) {
  if (!resource) {
    return (
      <div role="status" aria-label={m.loading} className="flex items-center gap-3">
        <Skeleton className="size-14 rounded-2xl" />
        <div className="grid flex-1 gap-2">
          <Skeleton className="h-7 w-48 rounded-md" />
          <Skeleton className="h-4 w-32 rounded-md" />
        </div>
      </div>
    );
  }
  const Icon = TYPE_ICONS[resource.type];
  return (
    <header className="grid gap-4">
      <CoverPhoto
        of={{ resourceId: resource.id }}
        alt={m.photoAlt(resource.name)}
        className="aspect-[21/9] animate-tt-fade rounded-2xl"
      />
      <div className="flex items-center gap-3">
        <span className="tt-tile tt-hue-place size-14 animate-tt-pop rounded-2xl">
          <Icon size={28} aria-hidden />
        </span>
        <div className="grid min-w-0 gap-0.5">
          <h1 className="animate-tt-rise truncate text-2xl font-semibold tracking-tight [animation-delay:60ms]">
            {resource.name}
          </h1>
          <div className="animate-tt-rise [animation-delay:100ms]">
            <span className="sr-only">{m.types[resource.type]}, </span>
            <ResourcePrice resource={resource} />
          </div>
        </div>
      </div>
    </header>
  );
}
