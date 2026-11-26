import { Skeleton } from "@heroui/react";

import m from "../../i18n/en/booking";

/** The confirm step's shape while the resource and venue load: the ticket, then the price card. */
export function ConfirmSkeleton() {
  return (
    <div
      role="status"
      aria-label={m.loading}
      className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-8"
    >
      <div className="grid gap-5">
        <Skeleton className="h-8 w-56 rounded-md" />
        <div className="tt-panel grid gap-5 !rounded-[1.25rem] p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <Skeleton className="size-11 rounded-xl" />
              <div className="grid gap-2">
                <Skeleton className="h-5 w-36 rounded-md" />
                <Skeleton className="h-4 w-28 rounded-md" />
              </div>
            </div>
            <Skeleton className="h-16 w-14 rounded-xl" />
          </div>
          <Skeleton className="h-8 w-full rounded-md" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
      </div>
      <div className="tt-panel grid gap-5 p-5 lg:mt-13">
        <Skeleton className="h-7 w-full rounded-md" />
        <Skeleton className="h-7 w-full rounded-full" />
        <Skeleton className="h-16 w-full rounded-md" />
        <Skeleton className="h-12 rounded-full" />
      </div>
    </div>
  );
}
