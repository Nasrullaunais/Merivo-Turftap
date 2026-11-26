import { Hourglass } from "lucide-react";

import m from "../../i18n/en/myBookings";
import booking from "../../i18n/en/booking";
import { useNow } from "../../lib/time/useNow";

const TICK_MS = 1000;
const HURRY_MS = 5 * 60_000;

/** How long is left to pay: amber, red in the last 5 minutes, as on the booking's own page. */
export function PayTimer({ expiresAt }: { expiresAt: string }) {
  const leftMs = Date.parse(expiresAt) - useNow(TICK_MS);
  return (
    <span
      className={`${leftMs <= HURRY_MS ? "tt-tone-bad" : "tt-tone-watch"} tt-tone-text flex items-center gap-1.5 text-sm font-medium tabular-nums`}
    >
      <Hourglass size={15} aria-hidden className="shrink-0" />
      {m.payLeft(booking.pay.timeLeft(leftMs))}
    </span>
  );
}
