import { Button, Spinner } from "@heroui/react";

import m from "../../i18n/en/blockedTimes";
import { useBlockedTimes, useVenueTimeZone } from "./useBlockedTimes";
import { useUnblockTime } from "./useChangeBlockedTimes";

type Props = { resourceId: number; canUnblock: boolean };

export function BlockedTimeList({ resourceId, canUnblock }: Props) {
  const { data: blocks, isPending } = useBlockedTimes(resourceId);
  const timeZone = useVenueTimeZone(resourceId);
  const unblock = useUnblockTime();

  return (
    <section className="grid gap-2">
      <h2 className="text-lg font-semibold">{m.title}</h2>
      {(isPending || !timeZone) && <Spinner aria-label={m.loading} />}
      {blocks?.length === 0 && <p className="text-muted">{m.none}</p>}
      {timeZone && (
        <ul className="grid divide-y divide-separator">
          {blocks?.map((block) => {
            const window = m.window(block.startsAt, block.endsAt, timeZone);
            return (
              <li key={block.id} className="flex flex-wrap items-center gap-x-3 py-2">
                <span className="font-medium">{window}</span>
                {block.reason && <span className="text-muted">{block.reason}</span>}
                {canUnblock && (
                  <Button
                    className="ml-auto"
                    size="sm"
                    variant="danger-soft"
                    aria-label={m.unblockFor(window)}
                    onPress={() => unblock.mutate({ path: { id: block.id } })}
                  >
                    {m.unblock}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
