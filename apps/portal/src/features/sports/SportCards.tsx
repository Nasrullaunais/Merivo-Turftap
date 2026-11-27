import type { Resource, Venue } from "@turftap/contract/client";
import { formatMoney } from "@turftap/ui";

import { arrivalDelay } from "../../components/look";
import { OfferLink } from "../../components/OfferLink";
import { PictureCard, STRETCHED_LINK } from "../../components/PictureCard";
import { OFFER_ICONS, bySport } from "../../components/sportLook";
import resourcesText from "../../i18n/en/resources";
import m from "../../i18n/en/sports";
import { FreeTodayPill } from "../../components/FreeTodayPill";
import { useLowestPrice } from "./useLowestPrice";

const CARDS_START_MS = 220;

/** POR-02: one picture card per sport at a venue. Courts or tables of one sport share a card. */
export function SportCards({ venue, resources }: { venue: Venue; resources: Resource[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {bySport(resources).map((sport, index) => (
        <li
          key={sport.type}
          className="animate-tt-card-in"
          style={arrivalDelay(index, CARDS_START_MS)}
        >
          <SportCard venue={venue} type={sport.type} resources={sport.resources} />
        </li>
      ))}
    </ul>
  );
}

type CardProps = { venue: Venue; type: Resource["type"]; resources: Resource[] };

function SportCard({ venue, type, resources }: CardProps) {
  const lowest = useLowestPrice(resources);
  const Icon = OFFER_ICONS[type];
  return (
    <PictureCard
      photoOf={{ resourceId: resources[0]!.id }}
      scenes={[type]}
      alt={resourcesText.photoAlt(m.names[type])}
      badge={<FreeTodayPill resources={resources} venue={venue} />}
      icon={<Icon size={22} aria-hidden />}
      className="aspect-[4/3]"
      title={
        <OfferLink
          venueId={venue.id}
          offer={type}
          resourceIds={resources.map((resource) => resource.id)}
          gymOnly={false}
          className={STRETCHED_LINK}
        >
          {m.names[type]}
        </OfferLink>
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
