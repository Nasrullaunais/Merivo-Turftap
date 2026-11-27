const NOON = 12;
const MIDNIGHT = "24:00";

/** "11 PM", "6:30 AM" or "midnight", from an opening time like "23:00". */
const hourOf = (time: string) => {
  if (time === MIDNIGHT) return "midnight";
  const [hours, minutes] = time.split(":").map(Number) as [number, number];
  const clock = hours % NOON || NOON;
  const shown = minutes ? `${clock}:${String(minutes).padStart(2, "0")}` : `${clock}`;
  return `${shown} ${hours < NOON ? "AM" : "PM"}`;
};

export default {
  title: "What are you up for?",
  loading: "Loading venues",
  loadingVenue: "Loading the venue",
  empty: "No venues are open for booking yet.",
  coverAlt: (venueName: string) => `Photo of ${venueName}`,
  allVenues: "All venues",
  open: {
    now: (closes: string) => `Open now · until ${hourOf(closes)}`,
    later: (opens: string) => `Opens at ${hourOf(opens)}`,
    closed: "Closed now",
  },
  call: "Call",
};
