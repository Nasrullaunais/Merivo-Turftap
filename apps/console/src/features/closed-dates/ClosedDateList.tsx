import type { ClosedDate } from "@turftap/contract/client";
import { CalendarOff, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";

import { DateStub } from "../../components/DateStub";
import { IconAction } from "../../components/IconAction";
import { Row, Rows } from "../../components/Rows";
import { useFirstIds } from "../../components/useFirstIds";
import { EmptyLine, Section } from "../../components/Section";
import { SkeletonRows } from "../../components/SkeletonRows";
import m from "../../i18n/en/closedDates";
import { useReopenDate } from "./useChangeClosedDates";
import { useClosedDates } from "./useClosedDates";

type Props = { venueId: number; canReopen: boolean; addSlot?: ReactNode };

export function ClosedDateList({ venueId, canReopen, addSlot }: Props) {
  const { data: closedDates, isPending } = useClosedDates(venueId);

  return (
    <Section hue="plain" icon={CalendarOff} title={m.title} count={closedDates?.length}>
      {isPending && (
        <div className="p-3">
          <SkeletonRows label={m.loading} rows={2} />
        </div>
      )}
      {closedDates?.length === 0 && <EmptyLine>{m.none}</EmptyLine>}
      {!!closedDates?.length && <ClosedRows closedDates={closedDates} canReopen={canReopen} />}
      {addSlot}
    </Section>
  );
}

function ClosedRows({ closedDates, canReopen }: { closedDates: ClosedDate[]; canReopen: boolean }) {
  const reopen = useReopenDate();
  const isNew = useFirstIds(closedDates.map((closed) => closed.id));
  return (
    <Rows>
      {closedDates.map((closed, index) => (
        <Row
          key={closed.id}
          index={index}
          landed={isNew(closed.id)}
          lead={<DateStub date={closed.date} label={m.day(closed.date)} />}
          title={closed.reason ?? <span className="text-muted">{m.noReason}</span>}
          end={
            canReopen && (
              <IconAction
                icon={RotateCcw}
                label={m.reopenFor(m.day(closed.date))}
                hint={m.reopen}
                isPending={reopen.isPending && reopen.variables?.path.id === closed.id}
                onPress={() => reopen.mutate({ path: { id: closed.id } })}
              />
            )
          }
        />
      ))}
    </Rows>
  );
}
