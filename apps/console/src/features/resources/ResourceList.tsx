import { Link } from "@tanstack/react-router";
import type { Resource } from "@turftap/contract/client";
import { formatMoney } from "@turftap/ui";
import { Clock, LayoutGrid, PowerOff } from "lucide-react";

import { AddCard, CARD_LINK, CardCell, CardGrid } from "../../components/CardGrid";
import { EmptyLine, Section } from "../../components/Section";
import { SkeletonCards } from "../../components/SkeletonRows";
import { StatePill } from "../../components/StatePill";
import { TopicTile } from "../../components/TopicTile";
import { usePresence } from "../../components/usePresence";
import m from "../../i18n/en/resources";
import { TYPE_ICONS } from "../../components/resourceLook";
import { TurnOffResource } from "./TurnOffResource";
import { useResources } from "./useResources";

const CARD_MIN = "15rem";

type Props = { venueId: number; canTurnOff: boolean; onAdd?: () => void };

export function ResourceList({ venueId, canTurnOff, onAdd }: Props) {
  const { data: resources, isPending } = useResources(venueId);

  return (
    <Section hue="place" icon={LayoutGrid} title={m.title} count={resources?.length}>
      <div className="p-4">
        {isPending && <SkeletonCards label={m.loading} cards={2} min={CARD_MIN} />}
        {resources?.length === 0 && !onAdd && <EmptyLine>{m.none}</EmptyLine>}
        {resources && (resources.length > 0 || onAdd) && (
          <ResourceCards resources={resources} canTurnOff={canTurnOff} onAdd={onAdd} />
        )}
      </div>
    </Section>
  );
}

function ResourceCards({
  resources,
  canTurnOff,
  onAdd,
}: {
  resources: Resource[];
  canTurnOff: boolean;
  onAdd?: () => void;
}) {
  const shown = usePresence(resources, (resource) => resource.id);
  return (
    <CardGrid label={m.title} min={CARD_MIN}>
      {shown.map((present, index) => {
        const resource = present.item;
        return (
          <CardCell key={present.key} present={present} index={index}>
            <article
              className={`relative flex w-full flex-col gap-3 tt-card p-4 ${resource.active ? "" : "opacity-70"}`}
            >
              <div className="flex items-start gap-3">
                <TopicTile
                  hue="place"
                  icon={TYPE_ICONS[resource.type]}
                  size={40}
                  className="rounded-xl"
                />
                <div className="grid min-w-0 flex-1">
                  <Link
                    to="/resources/$resourceId"
                    params={{ resourceId: resource.id }}
                    className={`truncate font-semibold ${CARD_LINK}`}
                  >
                    {resource.name}
                  </Link>
                  <span className="truncate text-sm text-muted">{m.types[resource.type]}</span>
                </div>
                {resource.active
                  ? canTurnOff && (
                      <span className="relative z-10 -me-1.5 -mt-1">
                        <TurnOffResource resource={resource} />
                      </span>
                    )
                  : null}
              </div>
              <div className="mt-auto flex items-center justify-between gap-2 border-t border-[var(--tt-line)] pt-3 text-sm">
                {resource.active ? (
                  <span className="inline-flex items-center gap-1.5 text-muted tabular-nums">
                    <Clock aria-hidden size={14} />
                    {m.slotLength(resource.slotMinutes)}
                  </span>
                ) : (
                  <StatePill tone="off" icon={PowerOff} label={m.turnedOff} />
                )}
                <span className="font-semibold tabular-nums tt-hue-money text-[color-mix(in_oklab,var(--tt-hue)_80%,black)]">
                  {formatMoney(resource.price)}
                </span>
              </div>
            </article>
          </CardCell>
        );
      })}
      {onAdd && <AddCard label={m.addTitle} onPress={onAdd} />}
    </CardGrid>
  );
}
