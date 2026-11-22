export default {
  title: "Our venues",
  loading: "Loading venues",
  empty: "No venues are open for booking yet.",
  closed: "Closed",
  openingHours: (opens: string, closes: string) => `${opens} – ${closes}`,
};
