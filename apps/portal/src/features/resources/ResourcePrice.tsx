import { Skeleton } from "@heroui/react";
import type { Resource } from "@turftap/contract/client";
import { formatMoney } from "@turftap/ui";

import m from "../../i18n/en/resources";
import { usePriceRange } from "./usePriceRange";

/** "LKR 4,500 – LKR 6,000 per hour", or one price when no Price Rule changes it. */
export function ResourcePrice({ resource }: { resource: Resource }) {
  const { data: range } = usePriceRange(resource);
  if (!range) return <Skeleton className="h-5 w-32 rounded-md" />;
  const { lowest, highest } = range;
  return (
    <p className="animate-tt-fade text-sm">
      <span className="font-semibold tabular-nums">
        {lowest.amount === highest.amount
          ? formatMoney(lowest)
          : m.priceRange(formatMoney(lowest), formatMoney(highest))}
      </span>{" "}
      <span className="text-muted">{m.per(resource.slotMinutes)}</span>
    </p>
  );
}
