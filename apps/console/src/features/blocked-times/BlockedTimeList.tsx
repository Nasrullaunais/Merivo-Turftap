import type { BlockedTime } from "@turftap/contract/client";
import { Ban, LockOpen } from "lucide-react";
import type { ReactNode } from "react";

import { DateStub } from "../../components/DateStub";
import { IconAction } from "../../components/IconAction";
import { Row, Rows } from "../../components/Rows";
import { useFirstIds } from "../../components/useFirstIds";
import { EmptyLine, Section } from "../../components/Section";
import { SkeletonRows } from "../../components/SkeletonRows";
import m from "../../i18n/en/blockedTimes";
import { useBlockedTimes, useVenueTimeZone } from "./useBlockedTimes";
import { useUnblockTime } from "./useChangeBlockedTimes";

type Props = { resourceId: number; canUnblock: boolean; addSlot?: ReactNode };

/** VEN-07: Blocked Times that haven't ended, each on the date it starts. */
export function BlockedTimeList({ resourceId, canUnblock, addSlot }: Props) {
  const { data: blocks, isPending } = useBlockedTimes(resourceId);
  const timeZone = useVenueTimeZone(resourceId);

  return (
    <Section hue="plain" icon={Ban} title={m.title} count={blocks?.length}>
      {(isPending || !timeZone) && (
        <div className="p-3">
          <SkeletonRows label={m.loading} rows={2} />
        </div>
      )}
      {blocks?.length === 0 && <EmptyLine>{m.none}</EmptyLine>}
      {!!blocks?.length && timeZone && (
        <BlockRows blocks={blocks} timeZone={timeZone} canUnblock={canUnblock} />
      )}
      {addSlot}
    </Section>
  );
}

type RowsProps = { blocks: BlockedTime[]; timeZone: string; canUnblock: boolean };

function BlockRows({ blocks, timeZone, canUnblock }: RowsProps) {
  const unblock = useUnblockTime();
  const isNew = useFirstIds(blocks.map((block) => block.id));
  return (
    <Rows>
      {blocks.map((block, index) => {
        const window = m.window(block.startsAt, block.endsAt, timeZone);
        return (
          <Row
            key={block.id}
            index={index}
            landed={isNew(block.id)}
            lead={<DateStub date={m.startDate(block.startsAt, timeZone)} label={window} />}
            title={
              <span aria-hidden className="tabular-nums">
                {m.hours(block.startsAt, block.endsAt, timeZone)}
              </span>
            }
            detail={block.reason && <span>{block.reason}</span>}
            end={
              canUnblock && (
                <IconAction
                  icon={LockOpen}
                  label={m.unblockFor(window)}
                  hint={m.unblock}
                  isPending={unblock.isPending && unblock.variables?.path.id === block.id}
                  onPress={() => unblock.mutate({ path: { id: block.id } })}
                />
              )
            }
          />
        );
      })}
    </Rows>
  );
}
