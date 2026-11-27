import { Link } from "@tanstack/react-router";
import type { Resource, Venue } from "@turftap/contract/client";
import { formatMoney } from "@turftap/ui";

import { arrivalDelay } from "../../components/look";
import { PictureCard, STRETCHED_LINK } from "../../components/PictureCard";
import { OFFER_ICONS } from "../../components/sportLook";
import resourcesText from "../../i18n/en/resources";
import m from "../../i18n/en/sports";
import { FreeTodayPill } from "../../components/FreeTodayPill";
import { useLowestPrice } from "./useLowestPrice";

const CARDS_START_MS = 200;

/** The courts or tables of one sport, each with what is free today. A tap opens its times. */
export function ResourceCards({ venue, resources }: { venue: Venue; resources: Resource[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {resources.map((resource, index) => (
        <li
          key={resource.id}
          className="animate-tt-card-in"
          style={arrivalDelay(index, CARDS_START_MS)}
        >
          <ResourceCard venue={venue} resource={resource} />
        </li>
      ))}
    </ul>
  );
}

function ResourceCard({ venue, resource }: { venue: Venue; resource: Resource }) {
  const lowest = useLowestPrice([resource]);
  const Icon = OFFER_ICONS[resource.type];
  return (
    <PictureCard
      photoOf={{ resourceId: resource.id }}
      scenes={[resource.type]}
      alt={resourcesText.photoAlt(resource.name)}
      badge={<FreeTodayPill resources={[resource]} venue={venue} />}
      icon={<Icon size={22} aria-hidden />}
      className="aspect-[16/10]"
      title={
        <Link
          to="/resources/$resourceId"
          params={{ resourceId: resource.id }}
          className={STRETCHED_LINK}
        >
          {resource.name}
        </Link>
      }
    >
      <p className="h-5 truncate text-sm text-white/80">
        {lowest && (
          <span className="animate-tt-fade">
            {m.from}{" "}
            <span className="font-semibold text-white tabular-nums">
              {formatMoney(lowest.price)}
            </span>{" "}
            {resourcesText.perShort(lowest.slotMinutes)}
          </span>
        )}
      </p>
    </PictureCard>
  );
}
