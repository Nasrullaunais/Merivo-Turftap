import type { Resource, Venue } from "@turftap/contract/client";

import { GlassPill } from "./GlassPill";
import m from "../i18n/en/sports";
import slots from "../i18n/en/slots";
import { useFreeToday } from "./useFreeToday";

/** Few enough that a customer should hurry. */
const FEW_LEFT = 3;

/** Today at a glance, on a sport's or resource's picture: when it is free next, or how few are left. */
export function FreeTodayPill({
  resources,
  venue,
}: {
  resources: readonly Resource[];
  venue: Venue;
}) {
  const today = useFreeToday(resources, venue);
  if (!today) return null;
  if (today.kind === "over") return <GlassPill tone="off">{m.today.over}</GlassPill>;
  if (today.kind === "full") return <GlassPill tone="bad">{m.today.full}</GlassPill>;
  if (today.count <= FEW_LEFT) {
    return (
      <GlassPill tone="watch" live>
        {m.today.fewLeft(today.count)}
      </GlassPill>
    );
  }
  return (
    <GlassPill tone="good" live>
      {m.today.freeFrom(slots.clock(today.from, venue.timeZone))}
    </GlassPill>
  );
}
