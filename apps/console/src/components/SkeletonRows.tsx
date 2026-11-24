import { Skeleton } from "@heroui/react";

import { sweepIndex } from "./look";

const DEFAULT_ROWS = 3;

type Props = { label: string; rows?: number; tile?: boolean };

/** List rows still loading, shaped like the rows that replace them. */
export function SkeletonRows({ label, rows = DEFAULT_ROWS, tile = true }: Props) {
  return (
    <div role="status" aria-label={label} className="grid gap-2 tt-sweep">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} style={sweepIndex(index)} className="flex items-center gap-3 tt-panel p-3">
          {tile && <Skeleton className="size-8 shrink-0 rounded-lg" />}
          <div className="grid flex-1 gap-2">
            <Skeleton className="h-3 w-2/5 rounded" />
            <Skeleton className="h-3 w-1/4 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** One line of text still loading, such as a title. */
export function SkeletonLine({
  label,
  className = "h-4 w-48",
}: {
  label: string;
  className?: string;
}) {
  return (
    <span role="status" aria-label={label} className="inline-flex">
      <Skeleton className={`rounded-md ${className}`} />
    </span>
  );
}
