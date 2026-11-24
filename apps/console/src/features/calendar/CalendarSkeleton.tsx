import { Skeleton } from "@heroui/react";

const COLUMNS = 3;
const ROWS = 10;
// A few made-up bookings, so the skeleton reads as a calendar: [column, first row, rows tall].
const BLOCKS = [
  [0, 1, 2],
  [1, 3, 1],
  [2, 0, 2],
  [0, 6, 2],
  [2, 5, 3],
] as const;

/** The calendar's grid while its data loads, so nothing moves when the bookings land. */
export function CalendarSkeleton({
  label,
  withToolbar = false,
}: {
  label: string;
  withToolbar?: boolean;
}) {
  return (
    <div role="status" aria-label={label} className="grid gap-4">
      {withToolbar && (
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-10 w-56 rounded-lg" />
          <Skeleton className="h-10 w-36 rounded-full" />
          <Skeleton className="h-10 w-48 rounded-lg" />
        </div>
      )}
      <div
        className="grid gap-x-2 tt-panel p-3"
        style={{
          gridTemplateColumns: `3rem repeat(${COLUMNS}, 1fr)`,
          gridTemplateRows: `2rem repeat(${ROWS}, 2.5rem)`,
        }}
      >
        {Array.from({ length: COLUMNS }, (_, column) => (
          <Skeleton
            key={column}
            className="h-4 w-24 self-center rounded"
            style={{ gridColumn: column + 2, gridRow: 1 }}
          />
        ))}
        {Array.from({ length: ROWS }, (_, row) => (
          <Skeleton
            key={row}
            className="h-3 w-8 rounded"
            style={{ gridColumn: 1, gridRow: row + 2 }}
          />
        ))}
        {BLOCKS.map(([column, row, span]) => (
          <Skeleton
            key={`${column}-${row}`}
            className="m-0.5 rounded-lg"
            style={{ gridColumn: column + 2, gridRow: `${row + 2} / span ${span}` }}
          />
        ))}
      </div>
    </div>
  );
}
