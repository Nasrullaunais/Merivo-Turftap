import type { ResourceType } from "@turftap/contract";

import common from "./common";

const MINUTES_PER_HOUR = 60;

export default {
  title: "Choose what to book",
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
  priceRange: (lowest: string, highest: string) => `${lowest} – ${highest}`,
  notFound: {
    title: "We couldn't find this",
    body: "It may have been removed, or the link is wrong.",
    home: "See all venues",
  },
};
