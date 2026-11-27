import type { ResourceType } from "@turftap/contract";

import type { Offer } from "../../components/sportLook";

export default {
  /** Futsal courts are mostly also used for cricket, so customers look for both words. */
  names: {
    FUTSAL_COURT: "Futsal & cricket",
    TABLE_TENNIS_TABLE: "Table tennis",
    POOL_TABLE: "Pool",
    GYM: "Gym",
  } satisfies Record<Offer, string>,
  pick: {
    FUTSAL_COURT: "Pick a court",
    TABLE_TENNIS_TABLE: "Pick a table",
    POOL_TABLE: "Pick a table",
  } satisfies Record<ResourceType, string>,
  bookTitle: "Book a time",
  gymTitle: "Join the gym",
  everything: "Everything",
  filterLabel: "Show venues with",
  /** "at Cue Club Kandy", under a sport's name. */
  at: (venueName: string) => `at ${venueName}`,
  from: "From",
  loading: "Loading what you can book",
  notFound: {
    title: "Nothing to book here",
    body: "This venue doesn't offer that, or the link is wrong.",
    home: "See all venues",
  },
  today: {
    /** "Free from 4:30 PM", the first time still free today. */
    freeFrom: (time: string) => `Free from ${time}`,
    fewLeft: (count: number) => (count === 1 ? "Last time left today" : `Only ${count} left today`),
    full: "Fully booked today",
    over: "Book for another day",
  },
};
