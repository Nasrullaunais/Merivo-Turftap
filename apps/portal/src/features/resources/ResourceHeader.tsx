import { Skeleton } from "@heroui/react";
import type { Resource, Venue } from "@turftap/contract/client";
import { formatMoney } from "@turftap/ui";

import { PageHero } from "../../components/PageHero";
import { OFFER_ICONS } from "../../components/sportLook";
import m from "../../i18n/en/resources";
import { FreeTodayPill } from "../../components/FreeTodayPill";
import { usePriceRange } from "./usePriceRange";

/** The top of a resource's page: its picture, name, price and what is free today. */
export function ResourceHeader({ resource, venue }: { resource?: Resource; venue?: Venue }) {
  if (!resource || !venue) {
    return (
      <div role="status" aria-label={m.loading}>
        <Skeleton className="aspect-[16/9] w-full rounded-3xl sm:aspect-[21/8]" />
      </div>
    );
  }
  const Icon = OFFER_ICONS[resource.type];
  return (
    <PageHero
      photoOf={{ resourceId: resource.id }}
      scenes={[resource.type]}
      alt={m.photoAlt(resource.name)}
      badge={<FreeTodayPill resources={[resource]} venue={venue} />}
      icon={<Icon size={28} aria-hidden />}
      title={resource.name}
    >
      <span className="sr-only">{m.types[resource.type]}, </span>
      <Price resource={resource} />
    </PageHero>
  );
}

/** "LKR 4,500 – LKR 6,000 per hour", or one price when no Price Rule changes it. */
function Price({ resource }: { resource: Resource }) {
  const { data: range } = usePriceRange(resource);
  if (!range) return null;
  const { lowest, highest } = range;
  return (
    <span className="animate-tt-fade">
      <span className="font-semibold text-white tabular-nums">
        {lowest.amount === highest.amount
          ? formatMoney(lowest)
          : m.priceRange(formatMoney(lowest), formatMoney(highest))}
      </span>{" "}
      {m.per(resource.slotMinutes)}
    </span>
  );
}
