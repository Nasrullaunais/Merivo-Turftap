import { SkeletonRows } from "../../components/SkeletonRows";
import { LoadingButton } from "../../components/LoadingButton";
import m from "../../i18n/en/closedDates";
import { useReopenDate } from "./useChangeClosedDates";
import { useClosedDates } from "./useClosedDates";

export function ClosedDateList({ venueId, canReopen }: { venueId: number; canReopen: boolean }) {
  const { data: closedDates, isPending } = useClosedDates(venueId);
  const reopen = useReopenDate();

  return (
    <section className="grid gap-2">
      <h2 className="text-lg font-semibold">{m.title}</h2>
      {isPending && <SkeletonRows label={m.loading} rows={2} tile={false} />}
      {closedDates?.length === 0 && <p className="text-muted">{m.none}</p>}
      <ul className="grid divide-y divide-separator">
        {closedDates?.map((closed) => (
          <li key={closed.id} className="flex flex-wrap items-center gap-x-3 py-2">
            <span className="font-medium">{m.day(closed.date)}</span>
            {closed.reason && <span className="text-muted">{closed.reason}</span>}
            {canReopen && (
              <LoadingButton
                className="ml-auto"
                size="sm"
                variant="danger-soft"
                aria-label={m.reopenFor(m.day(closed.date))}
                isPending={reopen.isPending && reopen.variables?.path.id === closed.id}
                onPress={() => reopen.mutate({ path: { id: closed.id } })}
              >
                {m.reopen}
              </LoadingButton>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
