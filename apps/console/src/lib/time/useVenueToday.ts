import { useState } from "react";

import { onVenueClock } from "@turftap/ui";

/** Today's date on the venue's clock, read once when the screen opens. */
export function useVenueToday(timeZone: string | undefined) {
  const [now] = useState(() => new Date());
  return timeZone ? onVenueClock(now, timeZone).date : undefined;
}
