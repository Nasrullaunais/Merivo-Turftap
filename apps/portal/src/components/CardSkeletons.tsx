import { Skeleton } from "@heroui/react";

import { arrivalDelay } from "./look";

const SKELETON_CARDS = 3;

/** Grey cards shaped like the venue cards that replace them, so nothing moves when they land. */
export function CardSkeletons({ label }: { label: string }) {
  return (
    <ul role="status" aria-label={label} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: SKELETON_CARDS }, (_, index) => (
        <li
          key={index}
          className="tt-panel animate-tt-fade overflow-hidden"
          style={arrivalDelay(index)}
        >
          <Skeleton className="aspect-video w-full rounded-none" />
          <div className="grid gap-2 p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-[10px]" />
              <Skeleton className="h-5 w-2/3 rounded-md" />
            </div>
            <Skeleton className="h-4 w-1/2 rounded-md" />
          </div>
        </li>
      ))}
    </ul>
  );
}
