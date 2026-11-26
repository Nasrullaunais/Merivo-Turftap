/** The lists on My bookings, in the order of the switch. */
export const SHOWS = ["upcoming", "past", "memberships"] as const;
export type Show = (typeof SHOWS)[number];
