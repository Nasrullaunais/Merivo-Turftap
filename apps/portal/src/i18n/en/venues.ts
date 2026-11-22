export default {
  title: "Our venues",
  loading: "Loading venues",
  empty: "No venues are open for booking yet.",
  closed: "Closed",
  coverAlt: (venueName: string) => `Photo of ${venueName}`,
  openingHours: (opens: string, closes: string) => `${opens} – ${closes}`,
};
