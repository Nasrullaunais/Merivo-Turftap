const MINUTES_PER_HOUR = 60;

export default {
  /** "1 hour", "30 minutes", "1 hour 30 minutes" */
  lengthOf: (minutes: number) => {
    const hours = Math.floor(minutes / MINUTES_PER_HOUR);
    const rest = minutes % MINUTES_PER_HOUR;
    const parts = [
      hours === 1 ? "1 hour" : hours > 1 ? `${hours} hours` : "",
      rest ? `${rest} minutes` : "",
    ];
    return parts.filter(Boolean).join(" ");
  },
};
