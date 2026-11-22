import { Button, Spinner } from "@heroui/react";

import m from "../../i18n/en/closedDates";
import { useReopenDate } from "./useChangeClosedDates";
import { useClosedDates } from "./useClosedDates";

export function ClosedDateList({ venueId, canReopen }: { venueId: number; canReopen: boolean }) {
  const { data: closedDates, isPending } = useClosedDates(venueId);
  const reopen = useReopenDate();

  return (
    <section className="grid gap-2">
      <h2 className="text-lg font-semibold">{m.title}</h2>
      {isPending && <Spinner aria-label={m.loading} />}
      {closedDates?.length === 0 && <p className="text-muted">{m.none}</p>}
      <ul className="grid divide-y divide-separator">
        {closedDates?.map((closed) => (
          <li key={closed.id} className="flex flex-wrap items-center gap-x-3 py-2">
            <span className="font-medium">{m.day(closed.date)}</span>
            {closed.reason && <span className="text-muted">{closed.reason}</span>}
            {canReopen && (
              <Button
                className="ml-auto"
                size="sm"
                variant="danger-soft"
                aria-label={m.reopenFor(m.day(closed.date))}
                onPress={() => reopen.mutate({ path: { id: closed.id } })}
              >
                {m.reopen}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
