import type { Resource, Venue } from "@turftap/contract/client";
import { formatMoney } from "@turftap/ui";

import { PageHero } from "../../components/PageHero";
import { OFFER_ICONS } from "../../components/sportLook";
import resourcesText from "../../i18n/en/resources";
import m from "../../i18n/en/sports";
import { FreeTodayPill } from "../../components/FreeTodayPill";
import { useLowestPrice } from "./useLowestPrice";

type Props = { venue: Venue; type: Resource["type"]; resources: Resource[] };

/** The top of a sport's page: its picture, name, venue, lowest price and what is free today. */
export function SportHero({ venue, type, resources }: Props) {
  const lowest = useLowestPrice(resources);
  const Icon = OFFER_ICONS[type];
  return (
    <PageHero
      photoOf={{ resourceId: resources[0]!.id }}
      scenes={[type]}
      alt={resourcesText.photoAlt(m.names[type])}
      badge={<FreeTodayPill resources={resources} venue={venue} />}
      icon={<Icon size={28} aria-hidden />}
      title={m.names[type]}
    >
      {m.at(venue.name)}
      {lowest && (
        <>
          {" · "}
          {m.from}{" "}
          <span className="font-semibold text-white tabular-nums">{formatMoney(lowest.price)}</span>{" "}
          {resourcesText.per(lowest.slotMinutes)}
        </>
      )}
    </PageHero>
  );
}
