import type { Venue } from "@turftap/contract/client";

import m from "../i18n/en/venues";
import { useNow } from "../lib/time/useNow";
import { openNow } from "../lib/time/openNow";
import { GlassPill } from "./GlassPill";

const RECHECK_MS = 60_000;

/** "Open now · until 11 PM" on the venue's clock, kept up to date while the page is open. */
export function OpenPill({ venue }: { venue: Venue }) {
  const now = useNow(RECHECK_MS);
  const state = openNow(venue.openingHours, venue.timeZone, now);
  if (state.kind === "open") {
    return (
      <GlassPill tone="good" live>
        {m.open.now(state.closes)}
      </GlassPill>
    );
  }
  if (state.kind === "opensLater")
    return <GlassPill tone="watch">{m.open.later(state.opens)}</GlassPill>;
  return <GlassPill tone="off">{m.open.closed}</GlassPill>;
}
