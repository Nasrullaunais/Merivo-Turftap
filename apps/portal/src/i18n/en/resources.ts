import type { ResourceType } from "@turftap/contract";

import common from "./common";

const MINUTES_PER_HOUR = 60;

export default {
  loading: "Loading what you can book",
  empty: "Nothing here can be booked online yet.",
  types: {
    FUTSAL_COURT: "Futsal court",
    TABLE_TENNIS_TABLE: "Table tennis table",
    POOL_TABLE: "Pool table",
  } satisfies Record<ResourceType, string>,
  photoAlt: (resourceName: string) => `Photo of ${resourceName}`,
  /** "per hour", "per 30 minutes" */
  per: (slotMinutes: number) =>
    `per ${slotMinutes === MINUTES_PER_HOUR ? "hour" : common.lengthOf(slotMinutes)}`,
  /** "/ hour", "/ 30 min", "/ 1 h 30 min": the same, short enough for a card. */
  perShort: (slotMinutes: number) => {
    if (slotMinutes === MINUTES_PER_HOUR) return "/ hour";
    const hours = Math.floor(slotMinutes / MINUTES_PER_HOUR);
    const rest = slotMinutes % MINUTES_PER_HOUR;
    return `/ ${[hours ? `${hours} h` : "", rest ? `${rest} min` : ""].filter(Boolean).join(" ")}`;
  },
  priceRange: (lowest: string, highest: string) => `${lowest} – ${highest}`,
  notFound: {
    title: "We couldn't find this",
    body: "It may have been removed, or the link is wrong.",
    home: "See all venues",
  },
};
