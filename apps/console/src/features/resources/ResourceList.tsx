import { Link } from "@tanstack/react-router";
import type { Resource } from "@turftap/contract/client";
import { formatMoney } from "@turftap/ui";
import { Clock, LayoutGrid, PowerOff } from "lucide-react";
import type { ReactNode } from "react";

import { ROW_LINK, Row, Rows } from "../../components/Rows";
import { useFirstIds } from "../../components/useFirstIds";
import { EmptyLine, Section } from "../../components/Section";
import { SkeletonRows } from "../../components/SkeletonRows";
import { StatePill } from "../../components/StatePill";
import { TopicTile } from "../../components/TopicTile";
import m from "../../i18n/en/resources";
import { TYPE_ICONS } from "./resourceLook";
import { TurnOffResource } from "./TurnOffResource";
import { useResources } from "./useResources";

type Props = { venueId: number; canTurnOff: boolean; addSlot?: ReactNode };

export function ResourceList({ venueId, canTurnOff, addSlot }: Props) {
  const { data: resources, isPending } = useResources(venueId);

  return (
    <Section hue="place" icon={LayoutGrid} title={m.title} count={resources?.length}>
      {isPending && (
        <div className="p-3">
          <SkeletonRows label={m.loading} rows={2} />
        </div>
      )}
      {resources?.length === 0 && <EmptyLine>{m.none}</EmptyLine>}
      {!!resources?.length && <ResourceRows resources={resources} canTurnOff={canTurnOff} />}
      {addSlot}
    </Section>
  );
}

function ResourceRows({ resources, canTurnOff }: { resources: Resource[]; canTurnOff: boolean }) {
  const isNew = useFirstIds(resources.map((resource) => resource.id));
  return (
    <Rows>
      {resources.map((resource, index) => (
        <Row
          key={resource.id}
          index={index}
          landed={isNew(resource.id)}
          lead={<TopicTile hue="place" icon={TYPE_ICONS[resource.type]} size={36} />}
          title={
            <Link
              to="/resources/$resourceId"
              params={{ resourceId: resource.id }}
              data-row-link
              className={ROW_LINK}
            >
              {resource.name}
            </Link>
          }
          detail={
            <>
              <span>{m.types[resource.type]}</span>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Clock aria-hidden size={13} />
                {m.slotLength(resource.slotMinutes)}
              </span>
              <span className="font-medium text-foreground tabular-nums">
                {formatMoney(resource.price)}
              </span>
            </>
          }
          end={
            resource.active ? (
              canTurnOff && <TurnOffResource resource={resource} />
            ) : (
              <StatePill tone="off" icon={PowerOff} label={m.turnedOff} />
            )
          }
        />
      ))}
    </Rows>
  );
}
